FROM node:22

# install python and virtual environment tools
RUN apt-get update && \
    apt-get install -y bash python3 python3-pip python3-venv && \
    apt-get install -y build-essential gcc libffi-dev

# create virtual environment
RUN python3 -m venv /opt/venv

# activate virtual environment and install packages
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install awscli aws-sam-cli aws-sam-cli-local

# remove build dependencies
RUN apt-get remove -y build-essential gcc libffi-dev && \
    apt-get autoremove -y && \
    apt-get clean

# install esbuild for sam cli
RUN npm install -g esbuild

WORKDIR /app

RUN chown -R node:node /app

USER node
