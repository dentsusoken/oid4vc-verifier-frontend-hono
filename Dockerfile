##############################
# Build Stage
##############################
FROM public.ecr.aws/lambda/nodejs:22 as builder

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .
RUN npm run build

##############################
# Production Stage
##############################
FROM public.ecr.aws/lambda/nodejs:22

WORKDIR ${LAMBDA_TASK_ROOT}

COPY --from=builder /app/dist/* ./

CMD ["index.handler"]