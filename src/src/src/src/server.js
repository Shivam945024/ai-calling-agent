import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import twilio from "twilio";

import { connectToOpenAI } from "./realtime.js";

const app = express();
const server = createServer(app);

const wss = new WebSocketServer({
  noServer: true
});

app.use(express.urlencoded({ extended: false }));
app.use(express.json());


// ========================================
// HOME / HEALTH CHECK
// ========================================

app.get("/", (req, res) => {
  res.json({
    service: "AI Calling Agent",
    status: "running",
    message: "AI phone assistant is online"
  });
});


// ========================================
// TWILIO INCOMING CALL
// ========================================

app.post("/incoming-call", (req, res) => {

  console.log("Incoming phone call");

  const host =
    req.headers["x-forwarded-host"] ||
    req.headers.host;

  const response =
    new twilio.twiml.VoiceResponse();

  const connect =
    response.connect();

  connect.stream({
    url: `wss://${host}/media-stream`
  });

  res
    .type("text/xml")
    .send(response.toString());
});


// ========================================
// WEBSOCKET UPGRADE
// ========================================

server.on("upgrade", (request, socket, head) => {

  const pathname =
    new URL(
      request.url,
      `http://${request.headers.host}`
    ).pathname;

  if (pathname !== "/media-stream") {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(
    request,
    socket,
    head,
    (ws) => {
      wss.emit(
        "connection",
        ws,
        request
      );
    }
  );
});


// ========================================
// TWILIO MEDIA STREAM
// ========================================

wss.on("connection", (twilioWs) => {

  console.log(
    "Twilio Media Stream connected"
  );

  let streamSid = null;
  let callSid = null;


  // ======================================
  // CONNECT TO OPENAI REALTIME
  // ======================================

  const openaiWs =
    connectToOpenAI({

      // -------------------------------
      // OpenAI ready
      // -------------------------------

      onReady() {

        console.log(
          "OpenAI AI voice agent connected"
        );

      },


      // -------------------------------
      // AI AUDIO
      // -------------------------------

      onAudio(base64Audio) {

        if (
          !streamSid ||
          twilioWs.readyState !== 1
        ) {
          return;
        }

        const message = {

          event: "media",

          streamSid: streamSid,

          media: {
            payload: base64Audio
          }

        };

        twilioWs.send(
          JSON.stringify(message)
        );

      },


      // -------------------------------
      // AI ERROR
      // -------------------------------

      onError(error) {

        console.error(
          "OpenAI error:",
          error
        );

      },


      // -------------------------------
      // AI CLOSED
      // -------------------------------

      onClose() {

        console.log(
          "OpenAI connection closed"
        );

      }

    });


  // ======================================
  // RECEIVE DATA FROM TWILIO
  // ======================================

  twilioWs.on(
    "message",
    (message) => {

      try {

        const data =
          JSON.parse(
            message.toString()
          );


        // -----------------------------
        // CONNECTED
        // -----------------------------

        if (
          data.event === "connected"
        ) {

          console.log(
            "Twilio connected"
          );

        }


        // -----------------------------
        // CALL STARTED
        // -----------------------------

        if (
          data.event === "start"
        ) {

          streamSid =
            data.start.streamSid;

          callSid =
            data.start.callSid;

          console.log(
            "Call started:",
            callSid
          );

          console.log(
            "Stream:",
            streamSid
          );

        }


        // -----------------------------
        // CALL AUDIO
        // -----------------------------

        if (
          data.event === "media"
        ) {

          if (
            openaiWs.readyState === 1
          ) {

            openaiWs.send(
              JSON.stringify({

                type:
                  "input_audio_buffer.append",

                audio:
                  data.media.payload

              })
            );

          }

        }


        // -----------------------------
        // CALL STOPPED
        // -----------------------------

        if (
          data.event === "stop"
        ) {

          console.log(
            "Call stopped:",
            callSid
          );

          if (
            openaiWs.readyState === 1
          ) {

            openaiWs.close();

          }

        }

      } catch (error) {

        console.error(
          "Twilio message error:",
          error
        );

      }

    }
  );


  // ======================================
  // TWILIO CONNECTION CLOSED
  // ======================================

  twilioWs.on(
    "close",
    () => {

      console.log(
        "Twilio WebSocket closed"
      );

      if (
        openaiWs.readyState === 1
      ) {

        openaiWs.close();

      }

    }
  );


  // ======================================
  // TWILIO ERROR
  // ======================================

  twilioWs.on(
    "error",
    (error) => {

      console.error(
        "Twilio WebSocket error:",
        error
      );

    }
  );

});


// ========================================
// START SERVER
// ========================================

const PORT =
  process.env.PORT || 3000;

server.listen(
  PORT,
  () => {

    console.log(
      "================================="
    );

    console.log(
      "AI CALLING AGENT"
    );

    console.log(
      "================================="
    );

    console.log(
      `Server running on port ${PORT}`
    );

    console.log(
      `http://localhost:${PORT}`
    );

  }
);
