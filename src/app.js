import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
    origin : process.env.CROSS_ORIGIN,
    // ctrl + click to explore more
    credentials : true
}))


// named export 
export {app}