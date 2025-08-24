import { ConnectionProfile } from '@/lib/types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class ConnectionValidator {
  private static readonly BLOCKED_HOSTS = [
    '0.0.0.0',
    '::1',
    '10.0.0.0/8',
    '172.16.0.0/12',
    '192.168.0.0/16',
    '169.254.0.0/16',
    'fc00::/7',
    'fe80::/10'
  ];

  private static readonly BLOCKED_PORTS = [
    22,    // SSH
    21,    // FTP
    23,    // Telnet
    25,    // SMTP
    53,    // DNS
    80,    // HTTP
    443,   // HTTPS
    1433,  // SQL Server
    3306,  // MySQL
    5432,  // PostgreSQL
    27017, // MongoDB
    5984,  // CouchDB
    8080,  // HTTP Alt
    8443,  // HTTPS Alt
  ];

  static validateConnection(connection: Partial<ConnectionProfile>): ValidationResult {
    const errors: string[] = [];

    // Basic required fields
    if (!connection.name || connection.name.trim().length === 0) {
      errors.push('Connection name is required');
    }

    if (!connection.kind) {
      errors.push('Connection type is required');
    }

    // Validate based on connection type
    switch (connection.kind) {
      case 'standalone':
        errors.push(...this.validateStandaloneConnection(connection));
        break;
      case 'cluster':
        errors.push(...this.validateClusterConnection(connection));
        break;
      case 'sentinel':
        errors.push(...this.validateSentinelConnection(connection));
        break;
      default:
        errors.push('Invalid connection type');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private static validateStandaloneConnection(connection: Partial<ConnectionProfile>): string[] {
    const errors: string[] = [];

    // Host validation
    if (!connection.host || connection.host.trim().length === 0) {
      errors.push('Host is required for standalone connection');
    } else {
      const hostErrors = this.validateHost(connection.host);
      errors.push(...hostErrors);
    }

    // Port validation
    if (connection.port !== undefined) {
      const portErrors = this.validatePort(connection.port);
      errors.push(...portErrors);
    }

    // Database validation
    if (connection.db !== undefined && (connection.db < 0 || connection.db > 15)) {
      errors.push('Database number must be between 0 and 15');
    }

    return errors;
  }

  private static validateClusterConnection(connection: Partial<ConnectionProfile>): string[] {
    const errors: string[] = [];

    if (!connection.clusterHosts || connection.clusterHosts.length === 0) {
      errors.push('At least one cluster host is required');
    } else {
      for (const host of connection.clusterHosts) {
        if (!host.host || host.host.trim().length === 0) {
          errors.push('Cluster host address is required');
        } else {
          const hostErrors = this.validateHost(host.host);
          errors.push(...hostErrors.map(e => `Cluster host ${host.host}: ${e}`));
        }

        if (host.port !== undefined) {
          const portErrors = this.validatePort(host.port);
          errors.push(...portErrors.map(e => `Cluster host ${host.host}: ${e}`));
        }
      }
    }

    return errors;
  }

  private static validateSentinelConnection(connection: Partial<ConnectionProfile>): string[] {
    const errors: string[] = [];

    if (!connection.sentinel) {
      errors.push('Sentinel configuration is required');
    } else {
      if (!connection.sentinel.name || connection.sentinel.name.trim().length === 0) {
        errors.push('Sentinel master name is required');
      }

      if (!connection.sentinel.hosts || connection.sentinel.hosts.length === 0) {
        errors.push('At least one sentinel host is required');
      } else {
        for (const host of connection.sentinel.hosts) {
          if (!host.host || host.host.trim().length === 0) {
            errors.push('Sentinel host address is required');
          } else {
            const hostErrors = this.validateHost(host.host);
            errors.push(...hostErrors.map(e => `Sentinel host ${host.host}: ${e}`));
          }

          if (host.port !== undefined) {
            const portErrors = this.validatePort(host.port);
            errors.push(...portErrors.map(e => `Sentinel host ${host.host}: ${e}`));
          }
        }
      }
    }

    return errors;
  }

  private static validateHost(host: string): string[] {
    const errors: string[] = [];

    // Check for blocked hosts
    const lowerHost = host.toLowerCase();
    for (const blocked of this.BLOCKED_HOSTS) {
      if (blocked.includes('/')) {
        // CIDR notation - simple check for now
        if (lowerHost.startsWith(blocked.split('/')[0])) {
          errors.push(`Host ${host} is not allowed (blocked range: ${blocked})`);
        }
      } else if (lowerHost === blocked) {
        errors.push(`Host ${host} is not allowed`);
      }
    }

    // Basic format validation
    if (!/^[a-zA-Z0-9.-]+$/.test(host)) {
      errors.push(`Host ${host} contains invalid characters`);
    }

    // Length validation
    if (host.length > 253) {
      errors.push('Host name is too long (max 253 characters)');
    }

    return errors;
  }

  private static validatePort(port: number): string[] {
    const errors: string[] = [];

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      errors.push('Port must be an integer between 1 and 65535');
    }

    if (this.BLOCKED_PORTS.includes(port)) {
      errors.push(`Port ${port} is not allowed`);
    }

    return errors;
  }

  static sanitizeConnection(connection: Partial<ConnectionProfile>): ConnectionProfile {
    return {
      id: connection.id || '',
      name: connection.name?.trim() || '',
      kind: connection.kind || 'standalone',
      host: connection.host?.trim() || '127.0.0.1',
      port: connection.port || 6379,
      password: connection.password || undefined,
      tls: connection.tls || false,
      db: connection.db || 0,
      clusterHosts: connection.clusterHosts || [],
      sentinel: connection.sentinel || undefined,
      keyDelimiter: connection.keyDelimiter || ':'
    };
  }
}
