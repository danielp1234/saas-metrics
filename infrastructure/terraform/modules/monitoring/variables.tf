# terraform v1.0+ required for variable validation features
terraform {
  required_version = "~> 1.0"
}

# Environment variable with strict validation
variable "environment" {
  description = "Deployment environment (staging/production) with strict validation"
  type        = string

  validation {
    condition     = can(regex("^(staging|production)$", var.environment))
    error_message = "Environment must be either 'staging' or 'production'"
  }
}

# Project name variable for resource naming
variable "project_name" {
  description = "Name of the project for resource naming and tagging"
  type        = string
  default     = "saas-metrics"
}

# Prometheus configuration with comprehensive settings
variable "prometheus_config" {
  description = "Comprehensive configuration for Prometheus deployment including storage and scraping settings"
  type = object({
    retention_period     = string
    storage_size        = string
    metrics_port        = number
    scrape_interval     = string
    evaluation_interval = string
    alert_rules_path    = string
  })

  default = {
    retention_period     = "15d"
    storage_size        = "50Gi"
    metrics_port        = 9090
    scrape_interval     = "15s"
    evaluation_interval = "15s"
    alert_rules_path    = "/etc/prometheus/rules"
  }

  validation {
    condition     = can(regex("^[0-9]+[dwy]$", var.prometheus_config.retention_period))
    error_message = "Retention period must be specified in days (d), weeks (w), or years (y)"
  }

  validation {
    condition     = can(regex("^[0-9]+Gi$", var.prometheus_config.storage_size))
    error_message = "Storage size must be specified in Gigabytes (Gi)"
  }
}

# Grafana configuration with authentication and persistence settings
variable "grafana_config" {
  description = "Detailed configuration for Grafana deployment including authentication and persistence"
  type = object({
    admin_user              = string
    version                = string
    dashboard_provider_name = string
    persistence_size       = string
    plugins                = list(string)
    smtp_enabled           = bool
    auth_providers         = list(string)
  })

  default = {
    admin_user              = "admin"
    version                = "9.0.0"
    dashboard_provider_name = "saas-metrics"
    persistence_size       = "10Gi"
    plugins                = ["grafana-piechart-panel"]
    smtp_enabled           = false
    auth_providers         = ["google"]
  }

  validation {
    condition     = length(var.grafana_config.admin_user) >= 4
    error_message = "Admin username must be at least 4 characters long"
  }

  validation {
    condition     = can(regex("^[0-9]+\\.[0-9]+\\.[0-9]+$", var.grafana_config.version))
    error_message = "Grafana version must be in semantic versioning format (x.y.z)"
  }
}

# Elasticsearch configuration with performance and security settings
variable "elasticsearch_config" {
  description = "Configuration for Elasticsearch deployment with performance and security settings"
  type = object({
    version           = string
    heap_size         = string
    storage_size      = string
    replicas          = number
    security_enabled  = bool
    snapshot_schedule = string
  })

  default = {
    version           = "7.17.0"
    heap_size         = "1g"
    storage_size      = "30Gi"
    replicas          = 3
    security_enabled  = true
    snapshot_schedule = "0 0 * * *"
  }

  validation {
    condition     = var.elasticsearch_config.replicas >= 1
    error_message = "Elasticsearch must have at least 1 replica"
  }

  validation {
    condition     = can(regex("^[0-9]+[mMgG]$", var.elasticsearch_config.heap_size))
    error_message = "Heap size must be specified in megabytes (m/M) or gigabytes (g/G)"
  }
}

# Kibana configuration with high availability settings
variable "kibana_config" {
  description = "Configuration for Kibana deployment including high availability settings"
  type = object({
    version              = string
    replicas             = number
    security_enabled     = bool
    default_index_pattern = string
  })

  default = {
    version              = "7.17.0"
    replicas             = 1
    security_enabled     = true
    default_index_pattern = "logs-*"
  }

  validation {
    condition     = var.kibana_config.version == var.elasticsearch_config.version
    error_message = "Kibana version must match Elasticsearch version"
  }

  validation {
    condition     = var.kibana_config.replicas >= 1
    error_message = "Kibana must have at least 1 replica"
  }
}

# Monitoring namespace configuration
variable "monitoring_namespace" {
  description = "Kubernetes namespace for monitoring components with isolation"
  type        = string
  default     = "monitoring"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.monitoring_namespace))
    error_message = "Namespace must consist of lowercase alphanumeric characters or '-'"
  }
}