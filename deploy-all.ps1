$ErrorActionPreference = "Stop"

$env:GOOGLE_APPLICATION_CREDENTIALS="$PWD\gcp-key.json"
# Ensure AWS credentials are set in the environment before running this script
# $env:AWS_ACCESS_KEY_ID="..."
# $env:AWS_SECRET_ACCESS_KEY="..."
# $env:AWS_SESSION_TOKEN="..."
$env:TF_VAR_gcp_project_id="saws-lambda-legends-503718"

Write-Host "Authenticating Docker with GCP..."
cmd /c 'docker login -u _json_key --password-stdin https://gcr.io < gcp-key.json'

Write-Host "Building and pushing Frontend image..."
cd frontend
docker build -t gcr.io/saws-lambda-legends-503718/saws-frontend:latest .
docker push gcr.io/saws-lambda-legends-503718/saws-frontend:latest
cd ..

Write-Host "Building and pushing Analytics Backend image..."
cd backend
docker build -t gcr.io/saws-lambda-legends-503718/saws-analytics:latest .
docker push gcr.io/saws-lambda-legends-503718/saws-analytics:latest
cd ..

Write-Host "Deploying infrastructure with Terraform..."
cd terraform
# We use terraform from the current PATH if it exists.
terraform apply -auto-approve

Write-Host "Deployment complete!"
