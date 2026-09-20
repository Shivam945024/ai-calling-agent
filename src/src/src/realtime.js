import WebSocket from "ws";

const API_KEY = process.env.OPENAI_API_KEY;

const MODEL =
  process.env.OPENAI_REALTIME_MODEL ||
  "gpt-realtime-2.1-mini";

export function connectToOpenAI({
  onAudio,
  onError,
  onClose,
  onReady
}) {
  const url =
    `wss://api.openai.com/v1/realtime` +
    `?model=${encodeURIComponent(MODEL)}`;

  const ws = new WebSocket(url, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "OpenAI-Beta": "realtime=v1"
    }
  });

  ws.on("open", () => {
    console.log("Connected to OpenAI Realtime");

    ws.send(
      JSON.stringify({
        type: "session.update",

        session: {
          instructions: `
You are an AI phone receptionist.

Your name is AI Assistant.

You are talking to a caller over the telephone.

Be friendly, professional and concise.

Never pretend to be human.

Never invent information.

If you don't understand the caller,
ask them to repeat themselves.

Take messages when requested.
`,

          audio: {
            input: {
              format: {
                type: "audio/pcmu"
              }
            },

            output: {
              format: {
                type: "audio/pcmu"
              },

              voice: "marin"
            }
          },

          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500
          }
        }
      })
    );

    onReady?.();
  });

  ws.on("message", (raw) => {
    try {
      const event = JSON.parse(raw.toString());

      if (event.type === "response.output_audio.delta") {
        if (event.delta) {
          onAudio(event.delta);
        }
      }

      if (
        event.type ===
        "conversation.item.input_audio_transcription.completed"
      ) {
        console.log(
          "Caller:",
          event.transcript
        );
      }

      if (
        event.type ===
        "response.output_audio_transcript.delta"
      ) {
        process.stdout.write(
          event.delta || ""
        );
      }

      if (event.type === "error") {
        console.error(
          "OpenAI error:",
          event.error
        );

        onError?.(event.error);
      }
    } catch (error) {
      console.error(
        "Realtime parsing error:",
        error
      );
    }
  });

  ws.on("error", (error) => {
    console.error(
      "OpenAI WebSocket error:",
      error
    );

    onError?.(error);
  });

  ws.on("close", () => {
    console.log(
      "OpenAI connection closed"
    );

    onClose?.();
  });

  return ws;
}
