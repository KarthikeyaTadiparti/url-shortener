import express from "express";
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 3000;

app.get("/",(req, res)=>{
    res.send("Welcom to url-shortener api");
});

app.listen(port, ()=>{
    console.log(`App is running in http://localhost:${port}`)
});