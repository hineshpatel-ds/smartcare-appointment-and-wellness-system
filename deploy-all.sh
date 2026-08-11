


#!/bin/bash

# Ensure you have authenticated with gcloud before running this:
# gcloud auth login
# gcloud auth configure-docker

PROJECT_ID="saws-505203"
FRONTEND_IMAGE="gcr.io/${PROJECT_ID}/saws-frontend:latest"
ANALYTICS_IMAGE="gcr.io/${PROJECT_ID}/saws-analytics:latest"

echo "Building and pushing Frontend image..."
cd frontend
docker build -t ${FRONTEND_IMAGE} .
docker push ${FRONTEND_IMAGE}
cd ..

echo "Building and pushing Analytics Backend image..."
cd backend
docker build -t ${ANALYTICS_IMAGE} .
docker push ${ANALYTICS_IMAGE}
cd ..

echo "Images pushed! Now you can safely run terraform apply."
cd terraform
terraform apply -auto-approve
