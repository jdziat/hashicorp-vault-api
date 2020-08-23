storage "postgresql" {
  connection_url = "postgres://postgres:test@postgres:5432/vault?sslmode=disable"
}
## Enable UI
ui = true

listener "tcp" {
  address = "0.0.0.0:8200"
  tls_disable = 1
}