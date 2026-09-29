# nginx 笔记

- Author: Rory Cai (https://coiggahou2002.github.io/)
- Published: 2025-05-15 (Asia/Shanghai; 2025-05-15T00:00:00.000Z)
- Language: zh-CN
- Canonical: https://coiggahou2002.github.io/zh/blogs/nginx/
- English version: https://coiggahou2002.github.io/blogs/nginx/

下面是Nginx HTTP配置中常见的配置实例，涵盖了静态文件服务、反向代理、负载均衡、缓存设置等核心功能：

## Commands

使用以下命令测试配置是否正确：
```bash
nginx -t
```

如果配置无误，Nginx 会重新加载配置：
```bash
nginx -s reload
```

## server_name

在 Nginx 配置中，`server_name` 指令用于指定虚拟主机（Virtual Host）的域名或 IP 地址，它决定了 Nginx 如何根据客户端请求的域名来分发流量到不同的服务器块（`server` 块）。这是实现基于名称的虚拟主机（Name-based Virtual Hosting）的核心机制。


### **核心作用**
1. **域名匹配**：当客户端发送 HTTP 请求时，请求头中的 `Host` 字段会携带域名（如 `example.com`），Nginx 通过 `server_name` 匹配该域名，将请求路由到对应的 `server` 块。
2. **多域名支持**：一个 `server` 块可以配置多个域名，用空格分隔。
3. **默认服务器**：当请求的域名没有匹配到任何 `server_name` 时，请求会被路由到默认的 `server` 块（由 `listen` 指令的 `default_server` 参数指定）。


### **配置示例**
```sh
# 示例1：匹配单个域名
server {
    listen 80;
    server_name example.com;  # 仅匹配 example.com
    root /var/www/example;
}

# 示例2：匹配多个域名
server {
    listen 80;
    server_name example.com www.example.com;  # 同时匹配带www和不带www的域名
    root /var/www/example;
}

# 示例3：使用通配符
server {
    listen 80;
    server_name *.example.com;  # 匹配所有子域名（如 blog.example.com）
    root /var/www/subdomains;
}

# 示例4：使用正则表达式
server {
    listen 80;
    server_name ~^(.*)\.example\.com$;  # 正则匹配，$1 可在配置中引用
    root /var/www/$1;
}

# 示例5：默认服务器
server {
    listen 80 default_server;  # 所有未匹配的请求都会路由到这里
    server_name _;  # 使用下划线作为占位符
    return 444;  # 直接关闭连接或返回自定义错误页
}
```


### **匹配优先级规则**
当一个请求的 `Host` 头可以匹配多个 `server_name` 时，Nginx 按以下顺序选择最高优先级的 `server` 块：
1. **精确匹配**：例如 `server_name example.com`。
2. **以星号开头的通配符匹配**：例如 `server_name *.example.com`。
3. **以星号结尾的通配符匹配**：例如 `server_name mail.*`。
4. **正则表达式匹配**：例如 `server_name ~^www\d+\.example\.com$`。
5. **默认服务器**：由 `listen` 指令的 `default_server` 参数指定。


### **常见应用场景**
1. **同一 IP 托管多个网站**：在一台服务器上通过不同域名提供多个网站服务。
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

2. **处理 www 和非 www 域名**：将不带 www 的请求重定向到带 www 的域名。
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

3. **子域名分发**：将不同子域名指向不同目录或后端服务。
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


### **注意事项**
1. **大小写不敏感**：`server_name` 匹配时不区分大小写（如 `EXAMPLE.COM` 和 `example.com` 等效）。
2. **客户端必须发送 `Host` 头**：在 HTTP/1.1 中，`Host` 头是必需的。如果客户端不发送（如 HTTP/1.0 请求），Nginx 会将请求路由到默认服务器。
3. **泛域名解析**：若要匹配所有子域名，需配置 DNS 将所有子域名（如 `*.example.com`）解析到服务器 IP。
4. **正则表达式性能**：正则表达式匹配比精确匹配和通配符匹配更消耗性能，应尽量避免在高并发场景中大量使用。


### **总结**
`server_name` 是 Nginx 实现多站点、多域名服务的基础，通过灵活配置域名匹配规则，可以高效地将流量分发到不同的应用或服务中。合理设置默认服务器和优先级规则，能有效提升网站的可用性和安全性。

## 手册

### 1. 基础HTTP服务器配置
```nginx
http {
    # 基本设置
    include       mime.types;
    default_type  application/octet-stream;
    sendfile      on;
    keepalive_timeout  65;
    
    # 日志设置
    access_log  /var/log/nginx/access.log;
    error_log   /var/log/nginx/error.log;
    
    # Gzip压缩
    gzip  on;
    gzip_types text/plain text/css application/json application/javascript;
    
    # 虚拟主机配置
    server {
        listen       80;
        server_name  example.com;
        root         /var/www/html;
        
        # 访问控制
        location /admin/ {
            auth_basic           "Admin Area";
            auth_basic_user_file /etc/nginx/.htpasswd;
        }
        
        # 默认首页
        index index.html index.htm;
        
        # 错误页面
        error_page 500 502 503 504 /50x.html;
        location = /50x.html {
            root /var/www/error_pages;
        }
    }
}
```

### 2. 反向代理配置
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
        
        # 超时设置
        proxy_connect_timeout 30s;
        proxy_send_timeout    60s;
        proxy_read_timeout    60s;
        
        # 缓冲区设置
        proxy_buffer_size          128k;
        proxy_buffers              4 256k;
        proxy_busy_buffers_size    256k;
    }
}
```

### 3. 负载均衡配置
```nginx
http {
    # 负载均衡组
    upstream backend_servers {
        # 轮询策略（默认）
        server backend1.example.com weight=5;
        server backend2.example.com weight=3;
        server backend3.example.com backup;  # 备用服务器
        
        # IP哈希策略（保证同一客户端请求到同一服务器）
        # ip_hash;
        
        # 最少连接策略
        # least_conn;
    }
    
    server {
        listen 80;
        server_name loadbalancer.example.com;
        
        location / {
            proxy_pass http://backend_servers;
            proxy_http_version 1.1;
            proxy_set_header Connection "";  # 启用HTTP/1.1的keepalive
        }
    }
}
```

### 4. 静态文件服务优化
```nginx
server {
    listen 80;
    server_name static.example.com;
    
    location /static/ {
        root /data/www;
        expires 30d;  # 静态资源缓存30天
        add_header Cache-Control "public";
        
        # 禁用日志以提高性能
        access_log off;
        log_not_found off;
    }
    
    # 大文件下载优化
    location /download/ {
        sendfile on;
        sendfile_max_chunk 1m;  # 防止worker进程阻塞
        tcp_nopush on;
    }
}
```

### 5. HTTPS配置
```nginx
server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;  # HTTP重定向到HTTPS
}

server {
    listen 443 ssl http2;
    server_name example.com;
    
    # SSL证书配置
    ssl_certificate      /etc/nginx/ssl/cert.pem;
    ssl_certificate_key  /etc/nginx/ssl/key.pem;
    
    # SSL优化
    ssl_protocols TLSv1.3 TLSv1.2;  # 仅支持现代TLS协议
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS头部（强制HTTPS）
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
}
```

### 6. 缓存配置
```nginx
http {
    # 定义缓存区域
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=10g inactive=60m use_temp_path=off;
    
    server {
        listen 80;
        server_name cache.example.com;
        
        location / {
            proxy_pass http://backend;
            proxy_cache my_cache;  # 使用上面定义的缓存区域
            
            # 缓存策略
            proxy_cache_valid 200 302 10m;  # 成功响应缓存10分钟
            proxy_cache_valid 404      1m;  # 404缓存1分钟
            
            # 缓存键设置
            proxy_cache_key "$scheme$request_method$host$request_uri";
            
            # 缓存穿透控制
            proxy_cache_min_uses 3;  # 请求3次后才缓存
            proxy_no_cache $cookie_auth;  # 带认证cookie的请求不缓存
        }
    }
}
```

### 7. 限流配置
```nginx
http {
    # 定义限流区域
    limit_req_zone $binary_remote_addr zone=mylimit:10m rate=10r/s;
    
    server {
        listen 80;
        
        location /api/ {
            # 突发请求处理
            limit_req zone=mylimit burst=20 nodelay;
            
            # 连接数限制
            limit_conn perip 5;  # 每个IP最多5个并发连接
            limit_conn perserver 100;  # 服务器总并发连接数限制
            
            # 带宽限制
            limit_rate 100k;  # 限制下载速度为100KB/s
        }
    }
}
```

### 8. URL重写与跳转
```nginx
server {
    listen 80;
    server_name example.com;
    
    # 移除尾部斜杠
    rewrite ^/(.*)/$ /$1 permanent;
    
    # 旧URL跳转
    rewrite ^/old-path/(.*)$ /new-path/$1 redirect;
    
    # 根据参数跳转
    if ($args ~* "id=(\d+)") {
        return 301 /item/$1;
    }
    
    # 基于目录的跳转
    location /blog/ {
        rewrite ^/blog/(.*)$ https://blog.example.com/$1 permanent;
    }
}
```

### 9. WebSocket代理
```nginx
server {
    listen 80;
    
    location /ws/ {
        proxy_pass http://websocket_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        
        # 防止WebSocket连接超时
        proxy_read_timeout 86400;
    }
}
```

### 10. 防盗链配置
```nginx
server {
    listen 80;
    
    location ~* \.(jpg|jpeg|png|gif|pdf)$ {
        valid_referers none blocked example.com *.example.com;
        
        if ($invalid_referer) {
            return 403;
            # 或者重定向到防盗链图片
            # rewrite ^/ http://example.com/forbidden.png;
        }
    }
}
```

这些配置示例覆盖了Nginx HTTP模块的核心功能，实际使用时可以根据需求进行组合和调整。
