#!/bin/bash
# ===========================================
# SmartProperty - Kubernetes Deployment Script
# ===========================================
# Usage: ./deploy.sh
# Prerequisites: kubeadm cluster running, kubectl configured

set -e

echo "=== SmartProperty K8s Deployment ==="

# 1. Create namespace
echo "[1/8] Creating namespace..."
kubectl apply -f namespace.yaml

# 2. Create secrets and configmaps
echo "[2/8] Creating secrets and configmaps..."
kubectl apply -f secrets.yaml
kubectl apply -f configmap.yaml

# 3. Deploy infrastructure (MongoDB, Redis, MinIO, MailHog)
echo "[3/8] Deploying MongoDB..."
kubectl apply -f mongodb.yaml

echo "[4/8] Deploying Redis..."
kubectl apply -f redis.yaml

echo "[5/8] Deploying MinIO..."
kubectl apply -f minio.yaml

echo "[6/8] Deploying MailHog..."
kubectl apply -f mailhog.yaml

# 4. Wait for infrastructure to be ready
echo "Waiting for infrastructure pods..."
kubectl wait --for=condition=ready pod -l app=mongodb -n smartproperty --timeout=120s
kubectl wait --for=condition=ready pod -l app=redis -n smartproperty --timeout=60s

# 5. Deploy application services
echo "[7/8] Deploying Backend..."
kubectl apply -f backend.yaml

echo "[8/8] Deploying Frontend..."
kubectl apply -f frontend.yaml

# 6. Deploy AI services
echo "Deploying AI Services..."
kubectl apply -f ai-services.yaml

# 7. Show status
echo ""
echo "=== Deployment Complete ==="
echo ""
kubectl get pods -n smartproperty
echo ""
echo "=== Services ==="
kubectl get svc -n smartproperty
echo ""
echo "Access URLs (NodePort):"
echo "  Frontend:  http://<node-ip>:30080"
echo "  Backend:   http://<node-ip>:30000/api"
echo "  MinIO:     http://<node-ip>:30090"
