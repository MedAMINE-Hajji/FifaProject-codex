import { createServer } from 'node:http';

// Local test provider only. Browser tests never call an external AI service.
const server = createServer(async (request, response) => {
  if (request.method === 'GET') {
    response.writeHead(200).end('matchday test AI ready');
    return;
  }
  for await (const chunk of request) void chunk;
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
    isFifa: true, friendName: 'Browser Rival', playerClub: 'Arsenal', opponentClub: 'Barcelona',
    playerScore: 3, opponentScore: 1, possession: 55, shots: 12,
  }) } }] }));
});
server.listen(Number(process.argv[2] ?? 3200), '127.0.0.1');
process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
