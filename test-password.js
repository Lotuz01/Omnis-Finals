const bcrypt = require('bcryptjs');

const password = '123456';
const hash = '$2a$12$Whi/GkpbnAoJF0GrbRxoQumD2IqdenS3fainCyXbnsJPggfaZa2u.';

console.log('Testing password:', password);
console.log('Against hash:', hash);

bcrypt.compare(password, hash).then(result => {
  console.log('Password match:', result);
  process.exit(0);
}).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});