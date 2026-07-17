# DevOps Multi-Site Deployment with Kubernetes, Docker Compose and GitHub Actions

This project demonstrates a multi-site containerized setup deployed with Docker Compose and Kubernetes (KinD) with Helm. It features automated CI/CD pipelines via GitHub Actions targeting an AWS EC2 instance.

---

## Folder Structure

```text
devops-task/
├── .github/
│   └── workflows/
│       ├── deployments.yml        # Docker Compose deployment workflow
│       └── k8s-deployment.yaml    # Kubernetes & Helm deployment workflow (Primary)
├── k8s/
│   ├── site1/                     # Helm chart for Site 1 (raju-dev.duckdns.org)
│   │   ├── templates/             # Kubernetes templates (deployment, service, ingress, HPA)
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   ├── ingress.yaml
│   │   │   └── hpa.yaml
│   │   ├── Chart.yaml
│   │   └── values.yaml
│   ├── site2/                     # Helm chart for Site 2 (gadgethub.duckdns.org)
│   │   ├── templates/             # Kubernetes templates (deployment, service, ingress, HPA)
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   ├── ingress.yaml
│   │   │   └── hpa.yaml
│   │   ├── Chart.yaml
│   │   └── values.yaml
│   ├── config.yaml                # KinD cluster topology definition
│   ├── ingress-values.yaml        # Nginx Ingress Controller Helm configurations
│   └── get_helm.sh                # Helper script to download Helm
├── nginx/
│   └── default.conf               # Host-level Nginx reverse proxy configuration
├── site1/                         # Site 1 static website source files & configs
│   ├── assets/
│   ├── dockerfile
│   ├── index.html
│   ├── nginx.conf
│   ├── script.js
│   └── style.css
├── site2/                         # Site 2 static website source files & configs
│   ├── css/
│   ├── js/
│   ├── images/
│   ├── dockerfile
│   ├── index.html
│   ├── nginx.conf
│   └── styles.css
├── docker-compose.yml             # Docker Compose orchestration file
└── README.md                      # Project documentation (this file)
```

---

## Server Requirements

To run or deploy this project, the target deployment server (e.g., AWS EC2 Instance) should satisfy:

*   **Operating System**: Ubuntu 20.04 LTS or newer (Ubuntu 22.04/24.04 recommended).
*   **Hardware Profile**: Minimum 2 vCPUs, 4GB RAM (needed to host KinD, Docker container runtime, Kubernetes control plane, 2 worker nodes, and the host Nginx proxy comfortably).
*   **Privileges**: Sudo rights for installing system packages and handling the Docker daemon.
*   **Security Group Rules / Firewall ports**:
    *   `22/TCP` (SSH): For administrator management and GitHub Actions runners.
    *   `80/TCP` (HTTP): Open to incoming web traffic.
    *   `443/TCP` (HTTPS): For secured browser traffic.

---

## Docker Setup

Both `site1` and `site2` are containerized using minimal and secure environments:

1.  **Base Image**: `nginx:1.27-alpine` is used to ensure container security, performance, and small footprint.
2.  **Configurations**: 
    *   The internal site server configuration (`nginx.conf`) is copied to `/etc/nginx/conf.d/` (as `default.conf` or `site2.conf`).
    *   Internal server configurations listen on container port `8000`.
    *   Static files (HTML, CSS, JS, Assets) are copied to the standard `/usr/share/nginx/html/` folder.
3.  **Command**: The container starts with `nginx -g "daemon off;"` to run as a foreground process.

---

## Docker Compose Usage

The `docker-compose.yml` provides a lightweight method to run both applications concurrently on a single host.

### Services Defined:
*   **`site1`**: Builds from `./site1`, maps host port `8000` to container port `8000`.
*   **`site2`**: Builds from `./site2`, maps host port `8001` to container port `8000`.

Both containers use `restart: unless-stopped` to survive engine crashes, and run on separate bridge networks (`site1` and `site2`) for network layer isolation.

### Commands:

*   **Start the services**:
    ```bash
    docker compose up -d --build
    ```
*   **Stop the services**:
    ```bash
    docker compose down
    ```
*   **Check logs**:
    ```bash
    docker compose logs -f
    ```

---

## Host Nginx Configuration

In a production environment, the host-level Nginx acts as the entrypoint for incoming HTTP requests on port `80`. 

The file `nginx/default.conf` contains two server blocks:
1.  **`raju-dev.duckdns.org`**: Forwards all traffic to the local address `http://127.0.0.1:8080`.
2.  **`gadgethub.duckdns.org`**: Forwards all traffic to the local address `http://127.0.0.1:8080`.

Port `8080` is mapped directly to the Nginx Ingress Controller running inside the KinD cluster, which then performs host-based routing to direct the requests to the correct Helm releases.

---

## GitHub Actions Workflows

The repository includes two automated workflows under `.github/workflows/`:

### 1. Simple Docker Compose Deployment (deployments.yml)
*   **Trigger**: Pushes to `main`.
*   **Action**: SSHs into the EC2 instance using target secrets, clones/pulls the code, builds the containers, and launches them via `docker compose up -d --build`.

### 2. Kubernetes & Helm Deployment (k8s-deployment.yaml) - **Primary**
*   **Trigger**: Pushes to `main`.
*   **Action**: Performs full orchestration deployment on the EC2 instance:
    1.  Clones/updates git codebase.
    2.  Installs Docker, host-level Nginx, KinD, `kubectl`, and Helm if they are not already installed.
    3.  Spins up the KinD cluster using `k8s/config.yaml`.
    4.  Deploys the `ingress-nginx` controller via Helm.
    5.  Builds the Docker images for `site1` and `site2` under the `DOCKERHUB_USERNAME` repository namespace.
    6.  Loads the built images directly into the KinD cluster nodes.
    7.  Installs or upgrades Helm releases for `site1` (`./k8s/site1`) and `site2` (`./k8s/site2`).
    8.  Configures the host Nginx proxy configuration by copying `nginx/default.conf` to `/etc/nginx/sites-enabled/default.conf` and reloading Nginx.

---

## Deployment Steps

To set up and deploy this project to a fresh EC2 instance:

### Step 1: Spin up the Host
Launch an EC2 instance running Ubuntu. Ensure the security group allows SSH (`22`) from your runner, and HTTP (`80`/`443`) from anywhere.

### Step 2: Configure Secrets in GitHub
Navigate to your GitHub Repository > **Settings** > **Secrets and variables** > **Actions** and add the following secrets:
*   `EC2_HOST`: The public IP or DNS hostname of your server.
*   `EC2_USERNAME`: The SSH user (usually `ubuntu`).
*   `EC2_KEY`: Your private SSH key (PEM format).
*   `EC2_PORT`: SSH port (default is `22`).
*   `EC2_PROJECT_PATH`: The absolute path where the project should reside (e.g., `/home/ubuntu/devops-task`).
*   `EC2_REPO_URL`: The repository's git clone URL.
*   `DOCKERHUB_USERNAME`: Your Docker Hub username (used for tagging built images).

### Step 3: Trigger the pipeline
Push code changes to the `main` branch. The deployment workflow will execute automatically, installing all dependencies, starting the cluster, building the images, and running Helm charts.

---

## How to Run the Project Locally

### Method A: Docker Compose (Quick & Simple)
1.  Run the compose file:
    ```bash
    docker compose up -d --build
    ```
2.  Access the applications locally:
    *   **Site 1**: [http://localhost:8000](http://localhost:8000)
    *   **Site 2**: [http://localhost:8001](http://localhost:8001)

### Method B: Kubernetes (KinD) & Helm (Identical to Production)
1.  **Start the KinD Cluster**:
    ```bash
    kind create cluster --config k8s/config.yaml
    ```
2.  **Add Nginx Ingress Helm Repo & Install Ingress**:
    ```bash
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
    helm repo update
    helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
      --namespace ingress-nginx --create-namespace \
      -f k8s/ingress-values.yaml
    ```
3.  **Wait for Ingress Controller to be Ready**:
    ```bash
    kubectl wait --namespace ingress-nginx \
      --for=condition=ready pod \
      --selector=app.kubernetes.io/component=controller \
      --timeout=120s
    ```
4.  **Build and Load Images**:
    ```bash
    docker build -t local/site1:latest ./site1
    docker build -t local/site2:latest ./site2
    kind load docker-image local/site1:latest
    kind load docker-image local/site2:latest
    ```
5.  **Deploy Helm Charts**:
    ```bash
    helm upgrade --install site1 ./k8s/site1 \
      --set image.repository=local/site1 \
      --set image.tag=latest \
      --set image.pullPolicy=IfNotPresent

    helm upgrade --install site2 ./k8s/site2 \
      --set image.repository=local/site2 \
      --set image.tag=latest \
      --set image.pullPolicy=IfNotPresent
    ```
6.  **Simulate Domains Locally**:
    *   Open your host file (`/etc/hosts` on Linux/macOS or `C:\Windows\System32\drivers\etc\hosts` on Windows) and add:
        ```text
        127.0.0.1 raju-dev.duckdns.org
        127.0.0.1 gadgethub.duckdns.org
        ```
    *   Since port 8080 maps to the cluster ingress, you can now access the sites in your browser:
        *   **Site 1**: [http://raju-dev.duckdns.org:8080](http://raju-dev.duckdns.org:8080)
        *   **Site 2**: [http://gadgethub.duckdns.org:8080](http://gadgethub.duckdns.org:8080)

---

## Assumptions and Design Decisions

1.  **Dual Deployment Model**: The system is designed to support both Docker Compose (for fast local development and testing) and Kubernetes/Helm (for robust production-grade workloads).
2.  **Reverse Proxy Cascade**: A two-layer proxy strategy is used. Host Nginx forwards domain traffic to host port `8080`, which routes to the Ingress controller in the KinD container. The Ingress controller uses Host headers to route traffic to the appropriate Kubernetes Service.
3.  **Local Image Sideloading**: In the KinD workflow, we build the images locally on the host machine and load them directly into the cluster using `kind load docker-image`. This eliminates the need to push/pull from a public registry during every deployment cycle.
4.  **Domain Mapping**: The project relies on custom DuckDNS domains (`raju-dev.duckdns.org` and `gadgethub.duckdns.org`). External routing assumptions expect these hostnames to be mapped to the EC2 host's public IP address.
