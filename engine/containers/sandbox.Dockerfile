# Pin digest for reproducible builds and stable GHA cache layers.
# To update: docker pull kalilinux/kali-rolling:latest && docker inspect --format='{{index .RepoDigests 0}}' kalilinux/kali-rolling:latest
FROM kalilinux/kali-rolling@sha256:a3849f99f9f187122de4822341c49e55d250a771f2dbc5cfd56a146017e0e6ae

# Consolidated package install — one RUN layer to maximize cache hits
# and minimize image size. Kali apt sandbox disabled so it doesn't fail
# trying to drop privileges to the _apt user.
RUN echo "APT::Sandbox::User \"root\";" > /etc/apt/apt.conf.d/10sandbox && \
    sed -i 's|https://|http://|g' /etc/apt/sources.list* 2>/dev/null; \
    find /etc/apt/sources.list.d/ -name '*.sources' -exec sed -i 's|https://|http://|g' {} + 2>/dev/null; \
    apt-get update && \
    apt-get install -y --no-install-recommends --no-install-suggests \
        ca-certificates && \
    update-ca-certificates && \
    sed -i 's|http://|https://|g' /etc/apt/sources.list* 2>/dev/null; \
    find /etc/apt/sources.list.d/ -name '*.sources' -exec sed -i 's|http://|https://|g' {} + 2>/dev/null; \
    apt-get update && \
    apt-get install -y --no-install-recommends --no-install-suggests \
        # ── Core runtime ──
        curl \
        wget \
        python3 \
        python3-pip \
        tmux \
        # libcap2-bin: provides capsh for capability introspection
        # (VPS-P1-7). Lets ops/agents print the container's actual
        # capability set without `nsenter` from the host.
        libcap2-bin \
        # ── Recon ──
        nmap \
        dnsutils \
        whois \
        netcat-openbsd \
        iputils-ping \
        subfinder \
        # ── Exploit & post-exploitation ──
        hydra \
        sqlmap \
        nikto \
        smbclient \
        exploitdb \
        dirb \
        gobuster \
        # ── C2 client (connects to the separate c2-sliver server container) ──
        sliver && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*

# VPS-P0-2 follow-up: strip file-capabilities from nmap. The Kali package
# ships nmap with `cap_net_bind_service,cap_net_admin,cap_net_raw=eip` set
# via setcap. Combined with `security_opt: no-new-privileges:true` on the
# container (which ignores file caps that exceed the process bounding
# set) and our bounding set lacking NET_ADMIN, exec fails with "Operation
# not permitted". The container already runs as root with NET_RAW so
# nmap inherits the right caps from the process — file caps are redundant
# and now actively harmful.
RUN setcap -r /usr/lib/nmap/nmap || true

# Configure tmux: 50K line scrollback buffer to prevent output truncation
RUN echo "set-option -g history-limit 50000" > /root/.tmux.conf

# Working directory for the agent's virtual filesystem.
# Runs as root — security boundary is the container, not the user.
# Root access is required for raw sockets (nmap SYN scans), packet capture,
# and unrestricted filesystem access during red team operations.
WORKDIR /workspace

# Entrypoint: chmod 777 /workspace so host user can access files without sudo.
# Security boundary is the container, not file permissions.
COPY containers/sandbox-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]

# Healthcheck: verify the sandbox is alive and tmux is usable.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD tmux -V >/dev/null 2>&1 || exit 1

# Keep the container alive so the backend can 'docker exec' into it
CMD ["tail", "-f", "/dev/null"]
