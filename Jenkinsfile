pipeline {
  agent { label 'docker' }
  environment {
    NODE_VERSION = '18'
    REGISTRY = credentials('DOCKER_REGISTRY_URL') // e.g. myregistry.example.com stored as secret text
    IMAGE_NAMESPACE = 'myorg/smartproperty-backend'
    DOCKER_CREDENTIALS = 'docker-creds-id' // configure in Jenkins Credentials
    // SONAR_HOST = credentials('SONAR_HOST_URL') // e.g. https://sonarqube.example.com
  }
  options { timestamps() }
  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Install & Test') {
      agent { label 'docker' }
      steps {
        dir('backend') {
          // Start a temporary Mongo container for tests
          sh '''
            echo "Starting temporary MongoDB for tests..."
            docker run -d --name test-mongo -e MONGO_INITDB_DATABASE=smartproperty mongo:6 || true
            # wait for mongo to be ready
            for i in $(seq 1 30); do
              if docker exec test-mongo mongo --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
                echo "Mongo ready"; break
              fi
              sleep 1
            done

            echo "Running backend tests inside Node container..."
            docker run --rm --network container:test-mongo -v ${WORKSPACE}/backend:/usr/src -w /usr/src node:${NODE_VERSION} bash -lc "npm ci && MONGODB_URI='mongodb://localhost:27017/smartproperty' npm test --silent"

            echo "Tearing down temporary MongoDB..."
            docker rm -f test-mongo || true
          '''
        }
      }
    }

    stage('Build (backend)') {
      agent { label 'docker' }
      steps {
        dir('backend') {
          // Build inside node container to keep environment consistent
          sh "docker run --rm -v ${WORKSPACE}/backend:/usr/src -w /usr/src node:${NODE_VERSION} bash -lc 'npm ci && npm run build'"
        }
      }
    }

    stage('SonarQube Analysis') {
      agent { label 'docker' }
      steps {
        dir('backend') {
          // Use Jenkins SonarQube plugin environment and run sonar-scanner inside a short-lived container
          withSonarQubeEnv('SonarQube') {
            sh "docker run --rm -v ${env.WORKSPACE}/backend:/usr/src -w /usr/src -e SONAR_AUTH_TOKEN=${env.SONAR_AUTH_TOKEN} sonarsource/sonar-scanner-cli:latest -Dsonar.projectKey=smartproperty-backend -Dsonar.sources=src -Dsonar.login=${env.SONAR_AUTH_TOKEN}"
          }
        }
      }
    }

    // stage('Build & Push Docker image') {
    //   agent { label 'docker' }
    //   steps {
    //     script {
    //       docker.withRegistry("https://${env.REGISTRY}", env.DOCKER_CREDENTIALS) {
    //         def img = docker.build("${env.IMAGE_NAMESPACE}:${env.BUILD_NUMBER}", "backend")
    //         img.push()
    //       }
    //     }
    //   }
    // }
  }
  post {
    success { echo 'Backend pipeline succeeded' }
    failure {
      echo 'Backend pipeline failed'
      script {
        node('docker') { cleanWs() }
      }
    }
    always {
      script {
        node('docker') { cleanWs() }
      }
    }
  }
}
