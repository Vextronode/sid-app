# syntax=docker/dockerfile:1
# Image sid-api (Laravel di PHP-FPM). Konteks build: apps/backend
#   docker build -t sid-api:<tag> apps/backend
# Tidak ada .env, APP_KEY, atau rahasia di dalam image; semua konfigurasi saat runtime.

FROM composer:2.10.3 AS composer

FROM php:8.3.35-fpm-trixie

# Ekstensi tambahan (sisanya bawaan image resmi): pdo_pgsql, gd, zip, opcache.
# Paket -dev dibuang lagi; pustaka runtime yang dibutuhkan .so ditandai manual
# (pola docker-library), ditambah libfcgi-bin untuk healthcheck.
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends libfcgi-bin; \
    savedAptMark="$(apt-mark showmanual)"; \
    apt-get install -y --no-install-recommends \
        libpq-dev libzip-dev libpng-dev libjpeg62-turbo-dev libfreetype-dev; \
    docker-php-ext-configure gd --with-freetype --with-jpeg; \
    docker-php-ext-install -j"$(nproc)" pdo_pgsql gd zip opcache; \
    apt-mark auto '.*' > /dev/null; \
    apt-mark manual $savedAptMark > /dev/null; \
    find /usr/local/lib/php/extensions -type f -name '*.so' -exec ldd '{}' ';' \
        | awk '/=>/ { so = $(NF-1); if (index(so, "/usr/local/") == 1) { next }; gsub("^/(usr/)?", "", so); printf "*%s\n", so }' \
        | sort -u \
        | xargs -r dpkg-query --search \
        | cut -d: -f1 \
        | sort -u \
        | xargs -r apt-mark manual; \
    apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false; \
    rm -rf /var/lib/apt/lists/*; \
    command -v runuser; \
    command -v cgi-fcgi; \
    php -m | grep -qi '^pdo_pgsql$'; \
    php -m | grep -qi '^gd$'; \
    php -m | grep -qi '^zip$'

COPY --from=composer /usr/bin/composer /usr/local/bin/composer

RUN cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"
COPY docker/php.ini "$PHP_INI_DIR/conf.d/zz-sid.ini"
COPY docker/www.conf /usr/local/etc/php-fpm.d/zz-sid-www.conf
COPY docker/entrypoint.sh /usr/local/bin/sid-entrypoint
# Buang CR bila file ter-checkout dengan CRLF (Windows), lalu jadikan executable.
RUN sed -i 's/\r$//' /usr/local/bin/sid-entrypoint && chmod 0755 /usr/local/bin/sid-entrypoint

WORKDIR /var/www/html

ENV COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_NO_INTERACTION=1

# Dependency dulu (cache lapisan), tanpa script/autoloader karena kode belum ada.
COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --no-progress --no-scripts --no-autoloader \
    && composer clear-cache

# Kode aplikasi (milik root; hanya storage dan bootstrap/cache yang writable).
COPY . .

# Direktori yang dikecualikan .dockerignore dibuat eksplisit. storage/app/public dan
# storage/app/private harus ada dan milik www-data karena volume bernama baru menyalin
# isi + kepemilikan dari image saat pertama dibuat.
RUN set -eux; \
    mkdir -p \
        storage/app/public \
        storage/app/private \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        storage/fonts \
        bootstrap/cache; \
    rm -f bootstrap/cache/*.php; \
    composer dump-autoload --no-dev --optimize --no-scripts; \
    php artisan package:discover --ansi; \
    composer check-platform-reqs --no-dev; \
    ln -sfn ../storage/app/public public/storage; \
    chown -R www-data:www-data storage bootstrap/cache

EXPOSE 9000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD SCRIPT_NAME=/ping SCRIPT_FILENAME=/ping REQUEST_METHOD=GET \
        cgi-fcgi -bind -connect 127.0.0.1:9000 | grep -q pong || exit 1

ENTRYPOINT ["sid-entrypoint"]
CMD ["php-fpm"]
