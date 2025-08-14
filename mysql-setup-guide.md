# Guia de Configuração do MySQL

## Problema Atual
O MySQL está rodando mas não conseguimos acessar com as credenciais padrão.

## Soluções Possíveis

### Opção 1: Usar XAMPP (Recomendado)
1. Baixe e instale o XAMPP: https://www.apachefriends.org/
2. Inicie o Apache e MySQL no painel do XAMPP
3. Acesse http://localhost/phpmyadmin
4. Crie um banco de dados chamado `sistema_gestao`
5. Configure o .env.local:
   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=sistema_gestao
   ```

### Opção 2: Resetar Senha do MySQL (Avançado)
1. Abra o Prompt de Comando como Administrador
2. Pare o serviço MySQL:
   ```
   net stop MySQL80
   ```
3. Inicie o MySQL em modo seguro:
   ```
   "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --skip-grant-tables
   ```
4. Em outro terminal, conecte sem senha:
   ```
   "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root
   ```
5. Execute:
   ```sql
   FLUSH PRIVILEGES;
   ALTER USER 'root'@'localhost' IDENTIFIED BY '';
   FLUSH PRIVILEGES;
   ```

### Opção 3: Usar MySQL em Nuvem
1. Crie uma conta no PlanetScale, Railway ou Aiven
2. Configure a string de conexão no .env.local
3. Use a URL de conexão fornecida

### Opção 4: Usar Docker (Se Docker Desktop estiver instalado)
1. Instale o Docker Desktop
2. Execute:
   ```
   docker run --name mysql-local -e MYSQL_ROOT_PASSWORD=root123 -e MYSQL_DATABASE=sistema_gestao -p 3306:3306 -d mysql:8.0
   ```
3. Configure o .env.local:
   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=root123
   DB_NAME=sistema_gestao
   ```

## Próximos Passos
Escolha uma das opções acima e execute o script `node setup-database.js` novamente após configurar o MySQL.