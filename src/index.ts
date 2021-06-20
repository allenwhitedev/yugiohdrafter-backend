import express from 'express';

const isProductionEnv = process.env.NODE_ENV === 'production' 

// rest of the code remains same
const app = express();
const PORT = isProductionEnv ? 80 : 8000;

app.use(express.static(`${__dirname}/static`, { dotfiles: 'allow' }))

// - routes
app.get('/', (req, res) => res.send('Express + TypeScript Server'));

app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${PORT} and`
    + `\nServing static assets from '${__dirname}/static'`);
});
