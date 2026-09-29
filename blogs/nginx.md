# Nginx Notes

- Author: Rory Cai (https://coiggahou2002.github.io/)
- Published: 2025-05-15 (Asia/Shanghai; 2025-05-15T00:00:00.000Z)
- Language: en
- Canonical: https://coiggahou2002.github.io/blogs/nginx/
- Chinese version: https://coiggahou2002.github.io/zh/blogs/nginx/

Below are common examples from Nginx HTTP configuration, covering core features like static file serving, reverse proxying, load balancing, and caching:

## Commands

Use this command to check whether the config is valid:
```bash
nginx -t
```

If the config is fine, reload Nginx:
```bash
nginx -s reload
```

## server_name

In Nginx config, the `server_name` directive specifies the domain names or IP addresses of a virtual host. It decides how Nginx routes traffic to different server blocks (`server` blocks) based on the domain in the client's request. It's the core mechanism behind name-based virtual hosting.


### **What it does**
1. **Domain matching**: When a client sends an HTTP request, the `Host` header carries the domain (e.g. `example.com`). Nginx matches that domain against `server_name` and routes the request to the corresponding `server` block.
2. **Multiple domains**: A single `server` block can list multiple domains, separated by spaces.
3. **Default server**: When the requested domain doesn't match any `server_name`, the request goes to the default `server` block (set via the `default_server` parameter of the `listen` directive).


### **Config examples**
```sh
# Example 1: match a single domain
server {
    listen 80;
    server_name example.com;  # only matches example.com
    root /var/www/example;
}

# Example 2: match multiple domains
server {
    listen 80;
    server_name example.com www.example.com;  # matches the domain with and without www
    root /var/www/example;
}

# Example 3: use a wildcard
server {
    listen 80;
    server_name *.example.com;  # matches all subdomains (e.g. blog.example.com)
    root /var/www/subdomains;
}

# Example 4: use a regular expression
server {
    listen 80;
    server_name ~^(.*)\.example\.com$;  # regex match; $1 can be referenced elsewhere in the config
    root /var/www/$1;
}

# Example 5: default server
server {
    listen 80 default_server;  # all unmatched requests are routed here
    server_name _;  # underscore as a placeholder
    return 444;  # close the connection outright, or return a custom error page
}
```


### **Match priority**
When a request's `Host` header could match several `server_name`s, Nginx picks the `server` block with the highest priority in this order:
1. **Exact match**: e.g. `server_name example.com`.
2. **Wildcard starting with an asterisk**: e.g. `server_name *.example.com`.
3. **Wildcard ending with an asterisk**: e.g. `server_name mail.*`.
4. **Regular expression match**: e.g. `server_name ~^www\d+\.example\.com$`.
5. **Default server**: set via the `default_server` parameter of the `listen` directive.


### **Common use cases**
1. **Hosting multiple sites on one IP**: serve several websites from a single server using different domains.
   ```nginx
   server {
       listen 80;
       server_name site1.com;
       root /var/www/site1;
   }

   server {
       listen 80;
       server_name site2.com;
       root /var/www/site2;
   }
   ```

2. **Handling www and non-www domains**: redirect requests without www to the www domain.
   ```nginx
   server {
       listen 80;
       server_name example.com;
       return 301 http://www.example.com$request_uri;
   }

   server {
       listen 80;
       server_name www.example.com;
       root /var/www/example;
   }
   ```

3. **Subdomain routing**: point different subdomains at different directories or backend services.
   ```nginx
   server {
       listen 80;
       server_name api.example.com;
       proxy_pass http://backend_api;
   }

   server {
       listen 80;
       server_name blog.example.com;
       root /var/www/blog;
   }
   ```


### **Things to watch out for**
1. **Case-insensitive**: `server_name` matching ignores case (`EXAMPLE.COM` and `example.com` are equivalent).
2. **Clients must send a `Host` header**: In HTTP/1.1 the `Host` header is required. If a client doesn't send one (e.g. an HTTP/1.0 request), Nginx routes the request to the default server.
3. **Wildcard DNS**: To match all subdomains, you need DNS configured so that every subdomain (e.g. `*.example.com`) resolves to the server's IP.
4. **Regex performance**: Regex matching costs more than exact or wildcard matching, so avoid leaning on it heavily in high-concurrency setups.


### **Summary**
`server_name` is the foundation of serving multiple sites and domains with Nginx. With flexible domain-matching rules, you can efficiently route traffic to different apps or services. Setting up the default server and priority rules sensibly goes a long way toward improving your site's availability and security.

## Cookbook

### 1. Basic HTTP server config
```nginx
http {
    # Basic settings
    include       mime.types;
    default_type  application/octet-stream;
    sendfile      on;
    keepalive_timeout  65;
    
    # Logging
    access_log  /var/log/nginx/access.log;
    error_log   /var/log/nginx/error.log;
    
    # Gzip compression
    gzip  on;
    gzip_types text/plain text/css application/json application/javascript;
    
    # Virtual host config
    server {
        listen       80;
        server_name  example.com;
        root         /var/www/html;
        
        # Access control
        location /admin/ {
            auth_basic           "Admin Area";
            auth_basic_user_file /etc/nginx/.htpasswd;
        }
        
        # Default index page
        index index.html index.htm;
        
        # Error pages
        error_page 500 502 503 504 /50x.html;
        location = /50x.html {
            root /var/www/error_pages;
        }
    }
}
```

### 2. Reverse proxy
```nginx
server {
    listen 80;
    server_name api.example.com;
    
    location / {
        proxy_pass http://backend_server:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout    60s;
        proxy_read_timeout    60s;
        
        # Buffers
        proxy_buffer_size          128k;
        proxy_buffers              4 256k;
        proxy_busy_buffers_size    256k;
    }
}
```

### 3. Load balancing
```nginx
http {
    # Load-balancing group
    upstream backend_servers {
        # Round robin (default)
        server backend1.example.com weight=5;
        server backend2.example.com weight=3;
        server backend3.example.com backup;  # backup server
        
        # IP hash (keeps a given client pinned to the same server)
        # ip_hash;
        
        # Least connections
        # least_conn;
    }
    
    server {
        listen 80;
        server_name loadbalancer.example.com;
        
        location / {
            proxy_pass http://backend_servers;
            proxy_http_version 1.1;
            proxy_set_header Connection "";  # enable HTTP/1.1 keepalive
        }
    }
}
```

### 4. Static file serving optimizations
```nginx
server {
    listen 80;
    server_name static.example.com;
    
    location /static/ {
        root /data/www;
        expires 30d;  # cache static assets for 30 days
        add_header Cache-Control "public";
        
        # Disable logging for better performance
        access_log off;
        log_not_found off;
    }
    
    # Large file download optimizations
    location /download/ {
        sendfile on;
        sendfile_max_chunk 1m;  # keep the worker process from blocking
        tcp_nopush on;
    }
}
```

### 5. HTTPS
```nginx
server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;  # redirect HTTP to HTTPS
}

server {
    listen 443 ssl http2;
    server_name example.com;
    
    # SSL certificates
    ssl_certificate      /etc/nginx/ssl/cert.pem;
    ssl_certificate_key  /etc/nginx/ssl/key.pem;
    
    # SSL tuning
    ssl_protocols TLSv1.3 TLSv1.2;  # modern TLS protocols only
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS header (enforce HTTPS)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
}
```

### 6. Caching
```nginx
http {
    # Define the cache zone
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=10g inactive=60m use_temp_path=off;
    
    server {
        listen 80;
        server_name cache.example.com;
        
        location / {
            proxy_pass http://backend;
            proxy_cache my_cache;  # use the cache zone defined above
            
            # Caching policy
            proxy_cache_valid 200 302 10m;  # cache successful responses for 10 minutes
            proxy_cache_valid 404      1m;  # cache 404s for 1 minute
            
            # Cache key
            proxy_cache_key "$scheme$request_method$host$request_uri";
            
            # Cache penetration control
            proxy_cache_min_uses 3;  # only cache after 3 requests
            proxy_no_cache $cookie_auth;  # don't cache requests carrying an auth cookie
        }
    }
}
```

### 7. Rate limiting
```nginx
http {
    # Define the rate-limit zone
    limit_req_zone $binary_remote_addr zone=mylimit:10m rate=10r/s;
    
    server {
        listen 80;
        
        location /api/ {
            # Burst handling
            limit_req zone=mylimit burst=20 nodelay;
            
            # Connection limits
            limit_conn perip 5;  # at most 5 concurrent connections per IP
            limit_conn perserver 100;  # cap on total concurrent connections to the server
            
            # Bandwidth limit
            limit_rate 100k;  # cap download speed at 100KB/s
        }
    }
}
```

### 8. URL rewrites and redirects
```nginx
server {
    listen 80;
    server_name example.com;
    
    # Strip trailing slash
    rewrite ^/(.*)/$ /$1 permanent;
    
    # Redirect old URLs
    rewrite ^/old-path/(.*)$ /new-path/$1 redirect;
    
    # Redirect based on query args
    if ($args ~* "id=(\d+)") {
        return 301 /item/$1;
    }
    
    # Directory-based redirect
    location /blog/ {
        rewrite ^/blog/(.*)$ https://blog.example.com/$1 permanent;
    }
}
```

### 9. WebSocket proxy
```nginx
server {
    listen 80;
    
    location /ws/ {
        proxy_pass http://websocket_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        
        # Keep WebSocket connections from timing out
        proxy_read_timeout 86400;
    }
}
```

### 10. Hotlink protection
```nginx
server {
    listen 80;
    
    location ~* \.(jpg|jpeg|png|gif|pdf)$ {
        valid_referers none blocked example.com *.example.com;
        
        if ($invalid_referer) {
            return 403;
            # or redirect to an anti-hotlinking image
            # rewrite ^/ http://example.com/forbidden.png;
        }
    }
}
```

These examples cover the core features of Nginx's HTTP module. In practice, mix and adapt them to fit your needs.
