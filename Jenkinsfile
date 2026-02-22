pipeline {
    agent any

    tools {
        // Use the currently installed NodeJS tool. Change to 'Node22' once configured in Jenkins.
        nodejs 'Node22'
    }

    environment {
        SONAR_SCANNER_OPTS = "-Xmx512m"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                dir('backend') {
                    // Verify Node/npm versions, then install dependencies
                    sh 'node -v && npm -v'
                    // Use legacy peer deps to avoid ERESOLVE failures in CI
                    sh 'npm install --legacy-peer-deps'
                }
            }
        }

        stage('Run Backend Tests with Coverage') {
            steps {
                dir('backend') {
                    sh 'npm run test -- --coverage'
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh "${tool 'sonar-scanner'}/bin/sonar-scanner"
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }
    }

    post {
        success {
            echo '✅ Backend tests + Sonar analysis succeeded'
        }
        failure {
            echo '❌ Pipeline failed – check logs'
        }
    }
}
