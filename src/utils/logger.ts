import pino from "pino";
import { dataEnv } from "../config/dataEnv.js";

export const logger = pino({ level: dataEnv.LOG_LEVEL });
