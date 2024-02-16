const express = require('express');
const  { DynamoDBClient, PutItemCommand, GetItemCommand, DeleteItemCommand } = require("@aws-sdk/client-dynamodb");
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

const app = express();

const client = new DynamoDBClient({});


app.use(express.json());

if (process.env.VCAP_SERVICES) {
  const services = JSON.parse(process.env.VCAP_SERVICES);
  if (Object.keys(services).length !== 0) {
    const cd = services["mongodbent"][0].credentials;
    process.env.DATABASE_URI = cd.database_uri;
  }
}

const API_PORT = process.env.API_PORT || 80;



app.use(express.static(path.join(__dirname, 'public')));



const validateUrl = (url) => {
  const CustomUrlId = /(https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z]{2,}(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?\/[a-zA-Z0-9]{2,}|((https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z]{2,}(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?)|(https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z0-9]{2,}\.[a-zA-Z0-9]{2,}\.[a-zA-Z0-9]{2,}(\.[a-zA-Z0-9]{2,})?/;
  return CustomUrlId.test(url);
};

const validateCustomUrlId = (url) => {
  const CustomUrlId = /^[a-zA-Z0-9]+$/;
  return CustomUrlId.test(url);
};


async function generateUniqueRandomOtuString() {
  let randomString;

  do {
    randomString = crypto.randomBytes(30).toString('hex');

    try {
      const command = new GetItemCommand({
        TableName: "urlDB",
        Key: {
          urlId: { S: randomString },
        },
      });

      const response = await client.send(command);

      if (response.Item === undefined) {
        return randomString;
      }

    } catch (error) {
      res.redirect('/');
    }

  } while (true);
}


async function generateUniqueRandomString() {
  let randomString;

  do {
    randomString = crypto.randomBytes(3).toString('hex').slice(0, 6);

    try {
      const command = new GetItemCommand({
        TableName: "urlDB",
        Key: {
          urlId: { S: randomString },
        },
      });

      const response = await client.send(command);

      if (response.Item === undefined) {
        return randomString;
      }

    } catch (error) {
      res.redirect('/');
    }

  } while (true);
}


async function getTimestamp() {
  return Date.now();
}




app.post('/api/link', async (req, res) => {
  const { link, customUrlId, otu } = req.body;
  const { origin: host } = req.headers;

  const validatedLink = link.startsWith('http://') || link.startsWith('https://') ? link : `https://${link}`;

  if (!validateUrl(validatedLink)) {
    return res.status(400).json({ success: false, error: 'Invalid url provided' });
  }

  try {
    if (otu === true) {
      const timestamp = await getTimestamp();

      const randomString = await generateUniqueRandomOtuString();

      const command = new PutItemCommand({
        TableName: "urlDB",
        Item: {
          urlId: { S: randomString},
          link: { S: validatedLink },
          timestamp: { N: timestamp.toString() },
        },
      });

      await client.send(command);

      const shortenedLink = `${host}/otu/${randomString}`;
      return res.status(200).json({ success: true, shortenedLink });
    } else {
      let urlIdToInsert;

      if (customUrlId) {
        if (!validateCustomUrlId(customUrlId)) {
          return res.status(401).json({ success: false, error: 'Invalid custom urlId' });
        }
        let errorStatus;
      
          try {
            const command = new GetItemCommand({
              TableName: "urlDB",
              Key: {
                urlId: { S: customUrlId },
              },
            });
      
           const response = await client.send(command);

           if (response.Item && response.Item.link && response.Item.link.S) {
            return res.status(402).json({ error: 'Custom URL already in use' });
          }

            errorStatus = 200;
      
          } catch (error) {
            res.redirect('/');
          }

        const timestamp = await getTimestamp();

        const command = new PutItemCommand({
          TableName: "urlDB",
          Item: {
            urlId: { S: customUrlId },
            link: { S: validatedLink },
            timestamp: { N: timestamp.toString() },
          },
        });
        

        const response = await client.send(command);

        urlIdToInsert = customUrlId;

      } else {
        const randomString = await generateUniqueRandomString();

        const timestamp = await getTimestamp();

        const command = new PutItemCommand({
          TableName: "urlDB",
          Item: {
            urlId: { S: randomString },
            link: { S: validatedLink },
            timestamp: { N: timestamp.toString() },
          },
        });
        

        const response = await client.send(command);

        urlIdToInsert = randomString;
      }

      const shortenedLink = `${host}/${urlIdToInsert}`;
      return res.status(200).json({ success: true, shortenedLink });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});





app.get('/:urlId', async (req, res) => {
  const { urlId } = req.params;

  try {
    const command = new GetItemCommand({
      TableName: "urlDB",
      Key: {
        urlId: { S: urlId },
      },
    });
    
    const response = await client.send(command);

    if (response.Item && response.Item.link && response.Item.link.S) {
      return res.redirect(response.Item.link.S);
    }
  } catch (error) {
    return res.redirect('/');
  }

  return res.redirect('/');
});





app.all('/otu/:otuUrlId', async (req, res) => {
  const { otuUrlId } = req.params;
  try {
    const command = new GetItemCommand({
      TableName: "urlDB",
      Key: {
        urlId: { S: otuUrlId },
      },
    });
    
    const response = await client.send(command);

    if (response.Item && response.Item.link && response.Item.link.S) {
      try {
        const command = new DeleteItemCommand({
          TableName: "urlDB",
          Key: {
            urlId: { S: otuUrlId },
          },
        });
        const response = await client.send(command);
      } catch (error) {
        return res.redirect('/');
      }
      return res.redirect(response.Item.link.S);
    }
  } catch (error) {
    return res.redirect('/');
  }
  return res.redirect('/');
});




app.listen(API_PORT, () => {
  console.log(`URL Shortener started on port ${API_PORT}`);
});
