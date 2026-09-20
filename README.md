# ai-calling-agent
ai-calling-agent
# AI Calling Agent

Real-time AI phone receptionist using:

- Node.js
- Express
- Twilio Voice
- Twilio Media Streams
- WebSockets
- OpenAI Realtime

## Architecture

Phone
↓
Twilio
↓
/incoming-call
↓
WebSocket /media-stream
↓
OpenAI Realtime
↓
AI voice
↓
Twilio
↓
Caller

## Install

npm install

## Environment

Create a `.env` file:

OPENAI_API_KEY=your_key
OPENAI_REALTIME_MODEL=gpt-realtime-2.1-mini

TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token

PORT=3000

## Start

npm start

## Development

npm run dev
