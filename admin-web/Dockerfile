# Web quan tri app nguoi benh — ban DOC LAP, khong nam trong SPA cua HIS.
#
# Build tu THU MUC GOC repo vi ma nguon 5 man nam o frontend/ va duoc dung lai qua alias:
#   docker build -f admin-web/Dockerfile -t his-patientapp-admin .

FROM node:20-alpine AS build
WORKDIR /src

# node_modules dung chung voi frontend/ — 5 man va _v2kit deu la ma nguon cua no.
COPY frontend/package.json frontend/package-lock.json frontend/
RUN cd frontend && npm ci --no-audit --no-fund

COPY frontend/ frontend/
COPY admin-web/ admin-web/

# Dia chi BFF nhung vao luc build (Vite thay bien VITE_* o thoi diem bundle).
ARG VITE_PATIENT_APP_API_URL=""
ENV VITE_PATIENT_APP_API_URL=$VITE_PATIENT_APP_API_URL

RUN cd admin-web \
 && ln -sfn ../frontend/node_modules node_modules \
 && ../frontend/node_modules/.bin/vite build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /src/admin-web/dist /usr/share/nginx/html
COPY admin-web/nginx.conf /etc/nginx/conf.d/default.conf
