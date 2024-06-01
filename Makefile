#!/usr/bin/make

run:
	docker run --network=host --env-file=.env frontend:latest

build:
	docker build -t frontend:latest .