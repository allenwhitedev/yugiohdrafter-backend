import express from 'express'
import fs from 'fs'
import https from 'https'

const isProductionEnv = process.env.NODE_ENV === 'production' 

// - initialize express server, serve .well-known file for letencrypt cert verification
const app = express()
app.use(express.static(`${__dirname}/static`, { dotfiles: 'allow' }))

// - routes
app.get('/', (req, res) => res.send('Express + TypeScript Server'))

// - start application
const PORT = isProductionEnv ? 443 : 8000
const envString = isProductionEnv ? 'Production' : 'Development'
const serverStartMessage = `⚡️[server]: ${envString} server is running at https://localhost:${PORT} and`
+ `\nServing static assets from '${__dirname}/static'`
if (isProductionEnv) 
{
  const letsencryptDomainPath = '/etc/letsencrypt/live/yugiohdrafter.com'
  https
  .createServer(
    {
      key: fs.readFileSync(`${letsencryptDomainPath}/privkey.pem`),
      cert: fs.readFileSync(`${letsencryptDomainPath}/cert.pem`),
      ca: fs.readFileSync(`${letsencryptDomainPath}/chain.pem`),
    },
    app
  )
  .listen(PORT, () => { console.log(serverStartMessage) })
}
else 
{
  app.listen(PORT, () => { console.log(serverStartMessage) })
}

