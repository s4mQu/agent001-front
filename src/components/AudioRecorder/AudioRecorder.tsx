"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Mic, Square, Play, Download } from "lucide-react";

const AudioRecorder: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
      }
    };
  }, [audioURL]);

  const startRecording = async () => {
    try {
      // Reset any previous errors
      setError(null);

      console.log("Requesting media permissions...");
      const stream = await navigator.mediaDevices?.getUserMedia({ audio: true });
      console.log("Permissions granted, creating MediaRecorder...");

      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        console.log("Data available event received");
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        console.log("Recording stopped, processing audio...");
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);

        // Optional: Send to backend
        sendAudioToServer(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      console.log("Recording started successfully");
    } catch (err) {
      console.error("Error starting recording:", err);
      setError("Failed to start recording. Please ensure microphone permissions are granted.");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    console.log("Stopping recording...");
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  const sendAudioToServer = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.wav");

      console.log("Sending audio to server...");
      const response = await fetch("http://localhost:3030/api/audio/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      console.log("Transcription:", data.transcription);
    } catch (err) {
      console.error("Error sending audio to server:", err);
      setError("Failed to process audio recording");
    }
  };

  return (
    <Card className="w-full max-w-md bg-gray-900 text-gray-100">
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="text-2xl font-bold mb-4">Audio Recorder</div>
          <div className="flex space-x-4">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              className={`${
                isRecording ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
              } text-white`}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
            >
              {isRecording ? <Square size={24} /> : <Mic size={24} />}
            </Button>
            {audioURL && (
              <>
                <Button
                  onClick={() => {
                    const audio = new Audio(audioURL);
                    audio.play();
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  aria-label="Play recorded audio"
                >
                  <Play size={24} />
                </Button>
                <Button
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = audioURL;
                    a.download = "recorded_audio.wav";
                    a.click();
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  aria-label="Download recorded audio"
                >
                  <Download size={24} />
                </Button>
              </>
            )}
          </div>
          <div className="text-sm text-gray-400 mt-2">
            {isRecording ? "Recording..." : "Ready to record"}
          </div>
          {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
        </div>
      </CardContent>
    </Card>
  );
};

export default AudioRecorder;
