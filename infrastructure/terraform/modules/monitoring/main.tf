# Required providers with version constraints
terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# Local values for resource naming and configuration
locals {
  namespace = "${var.project_name}-monitoring-${var.environment}"
  
  common_labels = {
    "app.kubernetes.io/managed-by" = "terraform"
    "app.kubernetes.io/environment" = var.environment
    "app.kubernetes.io/project"     = var.project_name
  }

  prometheus_labels = merge(local.common_labels, {
    "app.kubernetes.io/component" = "prometheus"
  })

  grafana_labels = merge(local.common_labels, {
    "app.kubernetes.io/component" = "grafana"
  })

  elasticsearch_labels = merge(local.common_labels, {
    "app.kubernetes.io/component" = "elasticsearch"
  })
}

# Create dedicated monitoring namespace with enhanced security
resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = local.namespace
    labels = local.common_labels
    
    annotations = {
      "net.beta.kubernetes.io/network-policy" = jsonencode({
        ingress = {
          isolation = "DefaultDeny"
        }
      })
    }
  }
}

# Deploy Prometheus with high availability and advanced configuration
resource "helm_release" "prometheus" {
  name       = "prometheus"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "prometheus"
  version    = "15.0.0"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name

  values = [
    yamlencode({
      server = {
        global = {
          scrape_interval     = var.prometheus_config.scrape_interval
          evaluation_interval = var.prometheus_config.evaluation_interval
        }
        retention      = var.prometheus_config.retention_period
        persistentVolume = {
          size = var.prometheus_config.storage_size
        }
        securityContext = {
          runAsNonRoot = true
          runAsUser    = 65534
        }
        resources = {
          limits = {
            cpu    = "1000m"
            memory = "2Gi"
          }
          requests = {
            cpu    = "500m"
            memory = "1Gi"
          }
        }
      }
      alertmanager = {
        enabled = true
        config = {
          global = {
            resolve_timeout = "5m"
          }
          route = {
            group_by    = ["alertname", "severity"]
            group_wait  = "30s"
            group_interval = "5m"
            repeat_interval = "12h"
            receiver = "default"
          }
          receivers = [{
            name = "default"
            email_configs = [{
              to = "alerts@${var.project_name}.com"
            }]
          }]
        }
      }
    })
  ]

  set {
    name  = "server.extraFlags"
    value = "{web.enable-lifecycle,storage.tsdb.retention.time=${var.prometheus_config.retention_period}}"
  }
}

# Deploy Grafana with comprehensive dashboard configuration
resource "helm_release" "grafana" {
  name       = "grafana"
  repository = "https://grafana.github.io/helm-charts"
  chart      = "grafana"
  version    = "6.30.0"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name

  values = [
    yamlencode({
      adminUser     = var.grafana_config.admin_user
      adminPassword = random_password.grafana_admin.result
      persistence = {
        enabled = true
        size    = var.grafana_config.persistence_size
      }
      datasources = {
        "datasources.yaml" = {
          apiVersion = 1
          datasources = [{
            name      = "Prometheus"
            type      = "prometheus"
            url       = "http://prometheus-server:${var.prometheus_config.metrics_port}"
            access    = "proxy"
            isDefault = true
          }]
        }
      }
      plugins = var.grafana_config.plugins
      auth = {
        google = {
          enabled = contains(var.grafana_config.auth_providers, "google")
          clientId = "oauth-client-id"
          clientSecret = "oauth-client-secret"
          allowSignUp = true
        }
      }
      resources = {
        limits = {
          cpu    = "500m"
          memory = "512Mi"
        }
        requests = {
          cpu    = "250m"
          memory = "256Mi"
        }
      }
    })
  ]
}

# Deploy Elasticsearch with security and high availability
resource "helm_release" "elasticsearch" {
  name       = "elasticsearch"
  repository = "https://helm.elastic.co"
  chart      = "elasticsearch"
  version    = var.elasticsearch_config.version
  namespace  = kubernetes_namespace.monitoring.metadata[0].name

  values = [
    yamlencode({
      replicas = var.elasticsearch_config.replicas
      esJavaOpts = "-Xmx${var.elasticsearch_config.heap_size} -Xms${var.elasticsearch_config.heap_size}"
      persistence = {
        enabled = true
        size    = var.elasticsearch_config.storage_size
      }
      security = {
        enabled = var.elasticsearch_config.security_enabled
        tls = {
          enabled = true
        }
      }
      resources = {
        limits = {
          cpu    = "2000m"
          memory = "${var.elasticsearch_config.heap_size}"
        }
        requests = {
          cpu    = "1000m"
          memory = "${var.elasticsearch_config.heap_size}"
        }
      }
      snapshotSchedule = var.elasticsearch_config.snapshot_schedule
    })
  ]
}

# Generate secure random password for Grafana admin
resource "random_password" "grafana_admin" {
  length  = 16
  special = true
}

# Export service endpoints
output "prometheus_endpoint" {
  value = "http://prometheus-server.${kubernetes_namespace.monitoring.metadata[0].name}:${var.prometheus_config.metrics_port}"
  description = "Prometheus server endpoint URL"
}

output "grafana_endpoint" {
  value = "http://grafana.${kubernetes_namespace.monitoring.metadata[0].name}"
  description = "Grafana dashboard endpoint URL"
}

output "elasticsearch_endpoint" {
  value = "https://elasticsearch-master.${kubernetes_namespace.monitoring.metadata[0].name}:9200"
  description = "Elasticsearch service endpoint URL"
}