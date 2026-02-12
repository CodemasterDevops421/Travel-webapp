.PHONY: install dev test docker-build run

install:
	npm install

dev:
	npm run dev

test:
	npm test

docker-build:
	docker build -t travel-webapp:latest .

run:
	docker compose up --build
