# Terraform v1.0+ required for output validation features
terraform {
  required_version = "~> 1.0"
}

# Prometheus endpoint for metrics collection
output "prometheus_endpoint" {
  description = "HTTPS endpoint URL for Prometheus metrics collection"
  value       = "https://${helm_release.prometheus.metadata[0].name}-server.${kubernetes_namespace.monitoring.metadata[0].name}:${var.prometheus_config.metrics_port}"
  sensitive   = false
}

# Grafana endpoint for dashboard access
output "grafana_endpoint" {
  description = "HTTPS endpoint URL for Grafana dashboards access"
  value       = "https://${helm_release.grafana.metadata[0].name}.${kubernetes_namespace.monitoring.metadata[0].name}"
  sensitive   = false
}

# Kibana endpoint for logging interface
output "kibana_endpoint" {
  description = "HTTPS endpoint URL for Kibana logging interface"
  value       = "https://kibana.${kubernetes_namespace.monitoring.metadata[0].name}"
  sensitive   = false
}

# Monitoring namespace for component discovery
output "monitoring_namespace" {
  description = "Kubernetes namespace where monitoring components are deployed"
  value       = kubernetes_namespace.monitoring.metadata[0].name
  sensitive   = false
}

# Prometheus metrics port for scraping configuration
output "prometheus_metrics_port" {
  description = "Port number for Prometheus metrics scraping"
  value       = var.prometheus_config.metrics_port
  sensitive   = false
}

# Grafana admin password (marked sensitive)
output "grafana_admin_password" {
  description = "Generated admin password for Grafana dashboard access"
  value       = random_password.grafana_admin.result
  sensitive   = true
}

# Prometheus service name for service discovery
output "prometheus_service_name" {
  description = "Kubernetes service name for Prometheus service discovery"
  value       = "${helm_release.prometheus.metadata[0].name}-server"
  sensitive   = false
}

# Elasticsearch hosts for log shipping
output "elasticsearch_hosts" {
  description = "List of Elasticsearch host endpoints for log shipping configuration"
  value = [
    for i in range(var.elasticsearch_config.replicas) :
    "https://${helm_release.elasticsearch.metadata[0].name}-${i}.${kubernetes_namespace.monitoring.metadata[0].name}:9200"
  ]
  sensitive = false
}

# Monitoring stack enabled flag
output "monitoring_enabled" {
  description = "Flag indicating if the monitoring stack is enabled and operational"
  value       = helm_release.prometheus.status == "deployed" && helm_release.grafana.status == "deployed" && helm_release.elasticsearch.status == "deployed"
  sensitive   = false
}

# AlertManager endpoint for alert routing
output "alert_manager_endpoint" {
  description = "HTTPS endpoint URL for AlertManager alert routing"
  value       = "https://${helm_release.prometheus.metadata[0].name}-alertmanager.${kubernetes_namespace.monitoring.metadata[0].name}:9093"
  sensitive   = false
}

# Additional metadata outputs for monitoring stack
output "monitoring_metadata" {
  description = "Metadata about the monitoring stack deployment"
  value = {
    prometheus_version    = helm_release.prometheus.metadata[0].chart_version
    grafana_version      = helm_release.grafana.metadata[0].chart_version
    elasticsearch_version = helm_release.elasticsearch.metadata[0].chart_version
    deployment_timestamp = timestamp()
    environment         = var.environment
    project_name        = var.project_name
  }
  sensitive = false
}

# Health check endpoints
output "health_check_endpoints" {
  description = "Endpoints for monitoring component health checks"
  value = {
    prometheus    = "https://${helm_release.prometheus.metadata[0].name}-server.${kubernetes_namespace.monitoring.metadata[0].name}/-/healthy"
    grafana       = "https://${helm_release.grafana.metadata[0].name}.${kubernetes_namespace.monitoring.metadata[0].name}/api/health"
    elasticsearch = "https://${helm_release.elasticsearch.metadata[0].name}-master.${kubernetes_namespace.monitoring.metadata[0].name}:9200/_cluster/health"
    alertmanager  = "https://${helm_release.prometheus.metadata[0].name}-alertmanager.${kubernetes_namespace.monitoring.metadata[0].name}:9093/-/healthy"
  }
  sensitive = false
}