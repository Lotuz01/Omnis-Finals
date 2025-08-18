async function createAdminUser() {
  const username = "04";
  const password = "Gengar1509@";
  const name = "Wendel";

  try {
    const response = await fetch('http://localhost:3000/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password, name, isAdmin: true }),
    });

    const data = await response.json();
    console.log(data);
    
    if (response.ok) {
      console.log('✅ Usuário administrador criado com sucesso!');
    } else {
      console.error('❌ Erro ao criar usuário:', data.error || 'Erro desconhecido');
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
  }
}

createAdminUser();