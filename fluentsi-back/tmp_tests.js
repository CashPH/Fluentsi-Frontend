(async () => {
  const questions = [
    'como se dice hola en ingles',
    'Explícame el pasado simple en inglés',
    'Cuál es el precio del curso JavaScript avanzado?',
    'Quién ganó el mundial 1998?',
    'traduce gracias por tu ayuda al ingles'
  ];

  for (const q of questions) {
    try {
      const res = await fetch('http://localhost:4000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q })
      });
      const json = await res.json();
      console.log('Q:', q);
      console.log('Status:', res.status);
      console.log('Answer:', json.answer || JSON.stringify(json));
      console.log('---');
    } catch (e) {
      console.error('Request error for:', q, e);
    }
  }
})();
