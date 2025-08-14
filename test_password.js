const bcrypt = require('bcryptjs');

const password = 'Gengar1509@';
const hash = '$2b$10$LHP5SMZctcdUNvWt55.R.eCGBradpSIe1Jtgx5hWWSiajvRgRKl4e';

console.log('Testando comparação de senha...');
console.log('Senha:', password);
console.log('Hash:', hash);

bcrypt.compare(password, hash).then(result => {
    console.log('Resultado da comparação:', result);
    if (result) {
        console.log('✅ Senha válida!');
    } else {
        console.log('❌ Senha inválida!');
    }
}).catch(err => {
    console.error('Erro na comparação:', err);
});

// Também vamos gerar um novo hash para comparar
bcrypt.hash(password, 10).then(newHash => {
    console.log('\nNovo hash gerado:', newHash);
    return bcrypt.compare(password, newHash);
}).then(result => {
    console.log('Comparação com novo hash:', result);
}).catch(err => {
    console.error('Erro ao gerar novo hash:', err);
});