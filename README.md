# Self-Claim Link v2

A modern, secure, and self-hostable platform for virtual product delivery. This application allows you to create and manage digital products and provide your customers with a simple and secure way to claim them using their order ID.

[![CI Pipeline](https://github.com/johnyww/self-claim-link/workflows/CI/badge.svg)](https://github.com/johnyww/self-claim-link/actions?query=workflow%3ACI)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

*   **Secure Product Claiming:** Customers can claim their virtual products using their unique order ID.
*   **Admin Dashboard:** A comprehensive dashboard for managing products, orders, and application settings.
*   **Customizable Orders:** Create orders with specific products, set expiration dates, and configure one-time use policies.
*   **Security-First:** Includes rate limiting, CSRF protection, and a robust Content Security Policy (CSP) to protect against common web vulnerabilities.
*   **Dockerized:** Comes with a multi-stage `Dockerfile` and `docker-compose.yml` for easy production deployment.
*   **CI/CD Ready:** Includes a comprehensive CI/CD workflow for automated testing, security scanning, and Docker image publishing.

## 🚀 Getting Started

### Prerequisites

*   Node.js (v20.x or later)
*   npm (v10.x or later)
*   Docker and Docker Compose (for production deployment)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/johnyww/self-claim-link-v2.git
    cd self-claim-link-v2
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Copy the `.env.example` file to a new file named `.env` and fill in the required values:
    ```bash
    cp .env.example .env
    ```
    Be sure to generate a strong `JWT_SECRET` and a secure `DEFAULT_ADMIN_PASSWORD`.

### Usage

*   **Development:**
    To start the development server, run:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

*   **Production Build:**
    To build the application for production, run:
    ```bash
    npm run build
    ```

*   **Production Start:**
    To start the production server, run:
    ```bash
    npm run start
    ```

## 🐳 Deployment (Docker)

This project is configured for easy deployment with Docker and Docker Compose.

1.  **Build and start the services:**
    ```bash
    docker-compose up --build -d
    ```
    This will build the application image and start the `app`, `postgres`, `redis`, and `backup` services in detached mode.

2.  **Accessing the application:**
    The application will be available at `http://localhost:3000`.

3.  **Stopping the services:**
    ```bash
    docker-compose down
    ```

## 🧪 Running Tests

*   **Unit and Integration Tests (Jest):**
    ```bash
    npm test
    ```

*   **Test Coverage:**
    To run tests and generate a coverage report:
    ```bash
    npm run test:coverage
    ```
    The report will be available in the `coverage/` directory.

*   **End-to-End Tests (Playwright):**
    ```bash
    npm run test:e2e
    ```

## 🤝 Contributing

Contributions are welcome! Please read the [CONTRIBUTING.md](CONTRIBUTING.md) file for guidelines on how to contribute to this project.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📦 GitHub and DockerHub Readiness

This section provides a complete guide to push your project to GitHub and build/push multi-platform Docker images to DockerHub.

### Prerequisites

*   **Git:** You must have Git installed on your local machine.
*   **Docker:** You must have Docker installed and running.
*   **GitHub Account:** You need a GitHub account and a new repository created for this project.
*   **DockerHub Account:** You need a DockerHub account.

### Step 1: GitHub Setup

These commands will initialize a new Git repository, add all files, commit them, and push to your existing GitHub repository.

1.  **Initialize Git and commit all changes:**
    ```bash
    git init
    git add .
    git commit -m "Initial commit: Project setup and professionalization"
    ```

2.  **Set up the remote repository:**
    Replace `johnyww/self-claim-link-v2.git` with your actual repository URL.
    ```bash
    git remote add origin https://github.com/johnyww/self-claim-link-v2.git
    ```

3.  **Push to the `main` branch:**
    ```bash
    git branch -M main
    git push -u origin main
    ```

### Step 2: DockerHub Setup (Multi-platform Build)

These steps will guide you through setting up `docker buildx`, logging in to DockerHub, and building/pushing your multi-platform Docker image.

1.  **Log in to DockerHub:**
    Enter your DockerHub username (`johnywy`) and password when prompted.
    ```bash
    docker login
    ```

2.  **Set up `docker buildx`:**
    Create and switch to a new builder instance that supports multi-platform builds.
    ```bash
    docker buildx create --name multi-platform-builder --use
    docker buildx inspect --bootstrap
    ```

3.  **Build and push the multi-platform image:**
    This command will build the Docker image for both `linux/amd64` (standard PCs, cloud servers) and `linux/arm64` (Apple Silicon, Raspberry Pi, some cloud instances), and push them to your DockerHub repository.

    The image will be tagged with `latest` and a semantic version tag based on `package.json` (e.g., `0.1.0`).

    ```bash
    docker buildx build \
      --platform linux/amd64,linux/arm64 \
      -t johnywy/self-claim-link-v2:latest \
      -t johnywy/self-claim-link-v2:0.1.0 \
      --push \
      .
    ```

### Rollback Instructions

In case something goes wrong, here's how you can roll back your changes.

#### GitHub Rollback

To revert the last commit you pushed to GitHub, you can use `git revert`. This will create a new commit that undoes the changes from the previous commit, which is a safe way to roll back.

1.  **Revert the last commit:**
    ```bash
    git revert HEAD --no-edit
    ```

2.  **Push the revert commit:**
    ```bash
    git push origin main
    ```

#### DockerHub Rollback

There's no direct "rollback" for a Docker image tag. The strategy is to re-tag a previously known-good image with the `latest` tag.

1.  **Pull the specific version you want to roll back to:**
    (Assuming `0.0.9` was the last stable version)
    ```bash
    docker pull johnywy/self-claim-link-v2:0.0.9
    ```

2.  **Re-tag the old version as `latest`:**
    ```bash
    docker tag johnywy/self-claim-link-v2:0.0.9 johnywy/self-claim-link-v2:latest
    ```

3.  **Push the `latest` tag to DockerHub:**
    ```bash
    docker push johnywy/self-claim-link-v2:latest
    ```

This will ensure that anyone pulling the `latest` tag gets the old, stable version.
