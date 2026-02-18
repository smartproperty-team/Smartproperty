pipeline {
  agent { label 'linux && docker' }
  environment {
    NODE_VERSION = '18'
    REGISTRY = credentials('DOCKER_REGISTRY_URL') // e.g. myregistry.example.com stored as secret text
    IMAGE_NAMESPACE = 'myorg/smartproperty-backend'
    DOCKER_CREDENTIALS = 'docker-creds-id' // configure in Jenkins Credentials
  }
  options { ansiColor('xterm') timestamps() }
  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Install & Test') {
      agent { docker { image "node:${env.NODE_VERSION}" args '--user root:root' } }
      steps {
        dir('backend') {
          sh 'npm ci'
          sh 'npm test --silent'
        }
      }
    }

    stage('Build (backend)') {
      agent { docker { image "node:${env.NODE_VERSION}" args '--user root:root' } }
      steps {
        dir('backend') {
          sh 'npm run build'
        }
      }
    }

    stage('Build & Push Docker image') {
      agent { label 'linux && docker' }
      steps {
        script {
          docker.withRegistry("https://${env.REGISTRY}", env.DOCKER_CREDENTIALS) {
            def img = docker.build("${env.IMAGE_NAMESPACE}:${env.BUILD_NUMBER}", "backend")
            img.push()
          }
        }
      }
    }
  }
  post {
    success { echo 'Backend pipeline succeeded' }
    failure { echo 'Backend pipeline failed'; cleanWs() }
    always { cleanWs() }
  }
}
