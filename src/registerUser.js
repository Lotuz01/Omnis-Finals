async function registerUser() {
  const username = "Wendel";
  const password = "Gengar1509@";
  const name = "Wendel Silva";

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
  } catch (error) {
    console.error('Error:', error);
  }
}

registerUser();