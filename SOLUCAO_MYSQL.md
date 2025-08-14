# 🔧 Soluções para Configurar MySQL no Projeto

O projeto está configurado para usar **MySQL** e precisa de um banco de dados funcionando. Aqui estão as **3 melhores opções**:

## ✅ Opção 1: XAMPP (Recomendado - Mais Fácil)

### Passos:
1. **Baixe o XAMPP**: https://www.apachefriends.org/
2. **Instale** o XAMPP
3. **Abra o XAMPP Control Panel**
4. **Inicie** os serviços:
   - ✅ Apache
   - ✅ MySQL
5. **Configure o .env.local**:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=pdv_system
   ```
6. **Execute**: `node setup-database.js`
7. **Inicie o servidor**: `npm run dev`

---

## ✅ Opção 2: Banco MySQL Online Gratuito

### PlanetScale (Recomendado):
1. **Acesse**: https://planetscale.com/
2. **Crie conta gratuita**
3. **Crie um banco de dados**
4. **Copie as credenciais**
5. **Configure o .env.local**:
   ```env
   DB_HOST=seu_host.planetscale.com
   DB_PORT=3306
   DB_USER=seu_usuario
   DB_PASSWORD=sua_senha
   DB_NAME=seu_banco
   ```

### Alternativa - FreeMySQLHosting:
1. **Acesse**: https://www.freemysqlhosting.net/
2. **Crie conta gratuita**
3. **Anote as credenciais fornecidas**
4. **Configure o .env.local** com os dados recebidos

---

## ✅ Opção 3: Configurar MySQL Existente

Se você já tem MySQL instalado mas não consegue conectar:

### Resetar senha do root:
1. **Abra CMD como Administrador**
2. **Pare o serviço**: `net stop MySQL80`
3. **Inicie sem verificação de senha**:
   ```cmd
   "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --skip-grant-tables
   ```
4. **Em outro CMD**, conecte:
   ```cmd
   "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root
   ```
5. **Execute**:
   ```sql
   USE mysql;
   UPDATE user SET authentication_string='' WHERE User='root';
   FLUSH PRIVILEGES;
   EXIT;
   ```
6. **Reinicie o serviço**: `net start MySQL80`

---

## 🚀 Após Configurar o MySQL

1. **Teste a conexão**:
   ```bash
   node test-mysql-connection.js
   ```

2. **Configure o banco**:
   ```bash
   node setup-database.js
   ```

3. **Inicie o servidor**:
   ```bash
   npm run dev
   ```

4. **Acesse**: http://localhost:3000

---

## 📞 Suporte

Se ainda tiver problemas:
- Verifique se o serviço MySQL está rodando: `Get-Service -Name "MySQL*"`
- Teste diferentes portas: 3306, 3307, 33060
- Verifique logs do MySQL em: `C:\ProgramData\MySQL\MySQL Server 8.0\Data\`

**Status atual**: ❌ MySQL não conectado
**Próximo passo**: Escolher uma das opções acima