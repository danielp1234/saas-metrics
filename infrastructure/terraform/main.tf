# Provider configuration
# AWS provider v4.0 for infrastructure resources
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
    datadog = {
      source  = "DataDog/datadog"
      version = "~> 3.0"
    }
  }
  required_version = ">= 1.0.0"

  backend "s3" {
    # Backend configuration should be provided via backend config file
    encrypt = true
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = local.common_tags
  }
}

provider "datadog" {
  api_key = var.monitoring_config.datadog_api_key
  app_key = var.monitoring_config.datadog_app_key
}

# Local variables
locals {
  project_name = "saas-metrics-platform"
  common_tags = {
    Project         = local.project_name
    Environment     = var.environment
    ManagedBy       = "terraform"
    SecurityLevel   = "high"
    BackupRequired  = "true"
    LastUpdated     = timestamp()
  }
}

# Random string for unique naming
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

# VPC Configuration
resource "aws_vpc" "main" {
  cidr_block                       = "10.0.0.0/16"
  enable_dns_hostnames            = true
  enable_dns_support              = true
  enable_network_address_usage_metrics = true

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-vpc"
  })
}

# Private Subnets
resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 4, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-private-${count.index + 1}"
    Type = "private"
  })
}

# Public Subnets
resource "aws_subnet" "public" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 4, count.index + 3)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-public-${count.index + 1}"
    Type = "public"
  })
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-igw"
  })
}

# NAT Gateway with EIP
resource "aws_eip" "nat" {
  count = 3
  vpc   = true

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-nat-eip-${count.index + 1}"
  })
}

resource "aws_nat_gateway" "main" {
  count         = 3
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-nat-${count.index + 1}"
  })
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-public-rt"
  })
}

resource "aws_route_table" "private" {
  count  = 3
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-private-rt-${count.index + 1}"
  })
}

# Database Module
module "database" {
  source = "./modules/database"

  environment             = var.environment
  vpc_id                 = aws_vpc.main.id
  subnet_ids             = aws_subnet.private[*].id
  instance_class         = var.database_config.instance_class
  allocated_storage      = var.database_config.allocated_storage
  max_connections        = var.database_config.max_connections
  engine_version         = "14.7"
  backup_retention_period = var.backup_config.retention_days
  multi_az              = true
  encryption_enabled     = true
  monitoring_interval    = 60
  parameter_group_family = "postgres14"
  
  tags = local.common_tags
}

# Redis Cache Module
module "cache" {
  source = "./modules/cache"

  environment                 = var.environment
  vpc_id                     = aws_vpc.main.id
  subnet_ids                 = aws_subnet.private[*].id
  node_type                  = var.cache_config.node_type
  num_cache_nodes            = var.cache_config.num_cache_nodes
  parameter_group_family     = var.cache_config.parameter_group_family
  memory_size_mb             = 2048
  automatic_failover_enabled = true
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  
  tags = local.common_tags
}

# Monitoring Module
module "monitoring" {
  source = "./modules/monitoring"

  environment          = var.environment
  vpc_id              = aws_vpc.main.id
  datadog_api_key     = var.monitoring_config.datadog_api_key
  log_retention_days  = 90
  alarm_notification_arn = var.monitoring_config.alarm_sns_topic
  
  tags = local.common_tags
}

# Security Group for Database
resource "aws_security_group" "database" {
  name_prefix = "${local.project_name}-${var.environment}-db-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.application.id]
  }

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-db-sg"
  })
}

# Security Group for Redis
resource "aws_security_group" "redis" {
  name_prefix = "${local.project_name}-${var.environment}-redis-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.application.id]
  }

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-redis-sg"
  })
}

# Security Group for Application
resource "aws_security_group" "application" {
  name_prefix = "${local.project_name}-${var.environment}-app-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-${var.environment}-app-sg"
  })
}

# Data source for availability zones
data "aws_availability_zones" "available" {
  state = "available"
}