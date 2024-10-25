---
title: "ArgoCD configuration on Bare metal with nginx-ingress and cloudflare tunnel"
date: 2024-05-18
author: "Backend Byte"
description: "Setting Up ArgoCD: A Guide to Configuration with Nginx-Ingress and Cloudflare Tunnel on Bare Meta."
tags: ["argocd"]
showToc: true
TocOpen: false
draft: false
hidemeta: false
comments: true
canonicalURL: "http://backendbyte.com/posts/2024-05-17-git-notes-2024/"
disableHLJS: false
disableShare: false
hideSummary: false
searchHidden: false
ShowReadingTime: true
ShowBreadCrumbs: true
ShowPostNavLinks: true
ShowWordCount: true
ShowRssButtonInSectionTermList: true
UseHugoToc: true
---

## Before starting, lets visualize a illustration how it works

![nginx-ingress.png](/images/posts/2024/argocd/nginx-ingress.png)

User initiates a request to a web application hosted on a cluster server. DNS resolution directs the user to Cloudflare. Cloudflare acts as a reverse proxy, terminating the SSL/TLS connection and initiating a tunnel to the Nginx ingress controller in the Kubernetes cluster. The Nginx ingress controller routes the request based on the Host header to the appropriate service within the cluster. The service distributes traffic across pods running the application. A selected pod processes the request and generates a response. The response travels back through the Nginx ingress controller, Cloudflare tunnel, and finally to the user's device.

# Install and configure argocd and nginx-ingress

First we have install argocd high availability version on our bare metal server. To install this,

```bash
sudo kubectl create namespace argocd
sudo kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.10.1/manifests/ha/install.yaml
```

## **Download With Curl (**`argocd` CLI)

```bash
wget https://github.com/argoproj/argo-cd/releases/download/v2.10.1/argocd-linux-amd64
mv argocd-linux-amd64 argocd
chmod +x argocd
mv argocd /usr/local/bin/
```

## Retrieve this password using the `argocd` CLI:

```bash
sudo kubectl -n argocd get secret
sudo kubectl -n argocd get secrets argocd-initial-admin-secret -o json
sudo kubectl -n argocd get secrets argocd-initial-admin-secret -o json | jq .data.password -r | base64 -d
```

## To edit any service of argocd

```bash
sudo kubectl -n argocd edit svc argocd-server
```

## Create argocd-ingress rule to route trafic

```yaml
## argocd-ingress.yml

apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-ingress
  namespace: argocd
  annotations:
    kubernetes.io/ingress.class: "nginx"
    alb.ingress.kubernetes.io/ssl-passthrough: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "false"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"

spec:
  rules:
    - host: argocd.example.com
      http:
        paths:
          - pathType: Prefix
            path: /
            backend:
              service:
                name: argocd-server
                port:
                  number: 80

```

## Create argocd-tunnel for configure cloudflare

```yaml
## argocd-tunnel.yml

apiVersion: apps/v1
kind: Deployment
metadata:
  namespace: argocd
  labels:
    app: cloudflared-argocd
  name: cloudflared-argocd
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cloudflared-argocd
  template:
    metadata:
      labels:
        app: cloudflared-argocd
    spec:
      containers:
        - name: cloudflared-argocd
          image: cloudflare/cloudflared:latest
          # image: ghcr.io/maggie0002/cloudflared:2022.7.1
          imagePullPolicy: Always
          args:
            [
              "tunnel",
              "--no-autoupdate",
              "run",
              "--token=place_your_token_here",
            ]
      restartPolicy: Always
      terminationGracePeriodSeconds: 60
```

# Configure nginx-ingress for handle ingress trafic

Link: https://kubernetes.github.io/ingress-nginx/deploy/

```yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/baremetal/deploy.yaml
```

Modify the simply set `server.insecure: "true"` in the `argocd-cmd-params-cm` ConfigMap

```bash
sudo kubectl -n argocd edit configmap argocd-cmd-params-cm
```

![configmap](/images/posts/2024/argocd/configmap.png)

Make sure to stop redirection http to https inside cloudflare

![cloudflare-dashboard](/images/posts/2024/argocd/cloudflare-dashboard.png)

Next make the change in nginx ingress controller deployment to add the enable-ssl-passthrough flag as shown below

```bash
kubectl edit deploy ingress-nginx-controller -n ingress-nginx
```

![spec-format](/images/posts/2024/argocd/spec-format.png)

Now its time to apply those two argocd-ingress.yml and argocd-tunnel.yml file

```bash
sudo kubectl apply -f argocd-ingress.yml
sudo kubectl apply -f argocd-tunnel.yml
```

## To make everything work perfectly, roleout the core-dns from kube-system namespace and restart deployment from argocd namespace.

```bash
kubectl rollout restart deployment coredns -n kube-system
sudo kubectl rollout restart deployment --namespace=argocd
sudo kubectl rollout restart deployment --namespace=ingress-nginx
```

# Operating procedure

## Create Application

before creating application, you must login to the sysyem. first check the argocd-server svc ip, then

```bash
kubectl get svc -n argocd
```

## Look for argocd-server ip

![kubectl-output](/images/posts/2024/argocd/kubectl-output.png)

## Login to argocd

```bash
argocd login 10.43.168.110

argocd app list
```

## Create application (using cli)

```bash
argocd app create auth-api \
--repo https://net.osl.team:20613/m2saas/core/M2S.AuthAPI.git \
--path k8s/dev \
--dest-namespace default \
--dest-server https://kubernetes.default.svc \
--directory-recurse \
--sync-policy automated
```

## sync application

```bash
argocd app sync auth-api
```

## Check app logs

```bash
argocd app logs auth-service
```

## Rollback with Argo CD CLI:

To rollback to a previous application revision, you can use the `argocd app rollback` command. You need to specify the name of the application and the target revision you want to roll back to.

```bash
argocd app rollback <APP_NAME> --revision <REVISION_NUMBER>
```

- `<APP_NAME>` is the name of the application you want to rollback.
- `<REVISION_NUMBER>` is the target revision number you want to roll back to. You can obtain revision numbers using `argocd app history <APP_NAME>`.

For example:

```bash
argocd app rollback auth-api --revision 3
```

### Rollout with Argo CD CLI:

To trigger a manual rollout of an application in Argo CD, you can use the `argocd app sync` command. This command synchronizes the application state with the desired state defined in the Git repository.

```bash
argocd app sync <APP_NAME>
```

- `<APP_NAME>` is the name of the application you want to trigger a rollout for.

For example:

```bash
argocd app sync auth-api
```

## if needed,

```bash
kubectl rollout restart deployment coredns -n kube-system
sudo kubectl rollout restart deployment --namespace=argocd

```

## For your information, to delete CDR and argocd app-

## Delete CRDs

```bash
sudo kubectl patch crd applications.argoproj.io -p '{"metadata": {"finalizers": null}}' --type merge
sudo kubectl delete crd applications.argoproj.io
```

## Delete argocd apps

```bash
sudo kubectl patch app auth-api-test -p '{"metadata": {"finalizers": null}}' --type merge

sudo kubectl delete app auth-api
```


Thanks for your read.

Happy Coding.