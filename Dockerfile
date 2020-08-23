FROM node:12
WORKDIR /usr/hashicorp-vault-api/
COPY ./package*.json ./
COPY ./lib ./lib
COPY ./test ./test
COPY ./wait-for-it.sh ./wait-for-it.sh
RUN chmod +x ./wait-for-it.sh
RUN npm install
ENV VAULT_ADDR="http://vault:8200"
# ENV DEBUG=""
ENV DEBUG="hashicorp-vault-api"
CMD ["npm","run","test"]