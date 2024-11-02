"use client";
import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

const socket = io();

const Home = () => {
  const [sessionStarted, setSessionStarted] = useState(false);
  const [audioChunksForGemini, setAudioChunksForGemini] = useState([]);
  const mediaRecorderForGeminiRef = useRef(null);
  const videoRef = useRef(null);
  const peerConnectionRef = useRef(null);

  useEffect(() => {
    let stream;

    const startSession = () => {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((userStream) => {
          stream = userStream;

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }

          peerConnectionRef.current = new RTCPeerConnection();

          stream.getTracks().forEach((track) => {
            peerConnectionRef.current.addTrack(track, stream);
          });

          const audioStream = new MediaStream(stream.getAudioTracks());
          mediaRecorderForGeminiRef.current = new MediaRecorder(audioStream);
          mediaRecorderForGeminiRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
              setAudioChunksForGemini((prev) => [...prev, event.data]);

              //   fetch("/api/sendToGemini", {
              //     method: "POST",
              //     headers: { "Content-Type": "audio/wav" },
              //     body: event.data,
              //   })
              //     .then((response) => {
              //       /* ... */
              //     })
              //     .catch((error) => {
              //       /* ... */
              //     });
            }
          };
          mediaRecorderForGeminiRef.current.onstop = () => {
            setAudioChunksForGemini([]);
          };

          const audioTrack = stream.getAudioTracks()[0];
          const audioContext = new AudioContext();
          const source = audioContext.createMediaStreamSource(
            new MediaStream([audioTrack])
          );
          const analyser = audioContext.createAnalyser();
          source.connect(analyser);

          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          let silenceTimeout = null;

          const checkAudioLevel = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const average = sum / bufferLength;

            if (average > 10) {
              if (mediaRecorderForGeminiRef.current.state !== "recording") {
                startRecordingForGemini();
              }
              clearTimeout(silenceTimeout);
            } else {
              if (mediaRecorderForGeminiRef.current.state === "recording") {
                silenceTimeout = setTimeout(() => {
                  stopRecordingForGemini();
                }, 1000);
              }
            }
            requestAnimationFrame(checkAudioLevel);
          };

          requestAnimationFrame(checkAudioLevel);

          const videoTrack = stream.getVideoTracks()[0];
          const intervalId = setInterval(() => {
            const canvas = document.createElement("canvas");
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
              // fetch("/api/sendVideoToGemini", {
              //   method: "POST",
              //   headers: { "Content-Type": "image/jpeg" },
              //   body: blob,
              // })
              //   .then((response) => {
              //     /* ... */
              //   })
              //   .catch((error) => {
              //     /* ... */
              //   });
            }, "image/jpeg");
          }, 30);

          peerConnectionRef.current.onicecandidate = (event) => {
            if (event.candidate) {
              socket.emit("ice-candidate", event.candidate);
            }
          };

          socket.on("ice-candidate", (candidate) => {
            peerConnectionRef.current.addIceCandidate(
              new RTCIceCandidate(candidate)
            );
          });

          return () => {
            if (stream) {
              stream.getTracks().forEach((track) => track.stop());
            }
            if (mediaRecorderForGeminiRef.current) {
              mediaRecorderForGeminiRef.current.stream
                .getTracks()
                .forEach((track) => track.stop());
            }
            peerConnectionRef.current.close();
            socket.disconnect();
            clearInterval(intervalId);
            audioContext.close();
          };
        })
        .catch((error) =>
          console.error("Error accessing media devices:", error)
        );
    };
  
    if (sessionStarted) {
      startSession();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      // ... other cleanup ...
    };
  }, [sessionStarted]);

  const handleStartSession = () => {
    setSessionStarted(true);
  };

  const startRecordingForGemini = () => {
    mediaRecorderForGeminiRef.current.start();
  };

  const stopRecordingForGemini = () => {
    mediaRecorderForGeminiRef.current.stop();
  };

  return (
    <div>
      {!sessionStarted && (
        <button onClick={handleStartSession}>Start Session</button>
      )}

      {sessionStarted && <video ref={videoRef} autoPlay muted playsInline />}
    </div>
  );
};

export default Home;
