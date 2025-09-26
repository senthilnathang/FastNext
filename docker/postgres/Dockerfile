# PostgreSQL Dockerfile with performance optimizations for FastNext Framework
FROM postgres:15-alpine

# Set environment variables for optimization
ENV POSTGRES_INITDB_ARGS="--encoding=UTF-8 --lc-collate=C --lc-ctype=C"
ENV POSTGRES_HOST_AUTH_METHOD=md5

# Install additional extensions and tools
RUN apk add --no-cache \
    postgresql-contrib \
    postgresql-plpython3 \
    curl \
    bash \
    && rm -rf /var/cache/apk/*

# Create directories for custom configuration and scripts
RUN mkdir -p /docker-entrypoint-initdb.d/
RUN mkdir -p /etc/postgresql-custom/

# Copy optimized PostgreSQL configuration
COPY postgresql.conf /etc/postgresql-custom/postgresql.conf
COPY pg_hba.conf /etc/postgresql-custom/pg_hba.conf

# Copy initialization scripts
COPY init-scripts/ /docker-entrypoint-initdb.d/

# Copy backup and maintenance scripts
COPY scripts/ /usr/local/bin/
RUN chmod +x /usr/local/bin/*.sh

# Set up custom configuration override
RUN echo "include '/etc/postgresql-custom/postgresql.conf'" >> /usr/share/postgresql/postgresql.conf.sample

# Create volume mount points
VOLUME ["/var/lib/postgresql/data", "/var/lib/postgresql/backups", "/var/log/postgresql"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-postgres} || exit 1

# Expose PostgreSQL port
EXPOSE 5432

# Use custom entrypoint for additional setup
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Labels for metadata
LABEL maintainer="FastNext Framework"
LABEL description="Optimized PostgreSQL for FastNext Framework"
LABEL version="1.0"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["postgres"]