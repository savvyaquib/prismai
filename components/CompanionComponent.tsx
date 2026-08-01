"use client";

import { cn, getSubjectColor } from "@/lib/utils";
import { vapi } from "@/lib/vapi.sdk";
import { useEffect, useState } from "react";

enum CallStatus {
  INACTIVE = "INACTIVE",
  ACTIVE = "ACTIVE",
  CONNECTING = "CONNECTING",
  ERROR = "ERROR",
  FINISHED = "FINISHED",
}

interface CompanionComponentProps {
  companionId: string;
  subject: string;
  topic: string;
  name: string;
  userName?: string;
  userImage?: string;
  style: string;
  voice: string;
}

const CompanionComponent = ({
  companionId,
  subject,
  topic,
  name,
  userName,
  userImage,
  style,
  voice,
}: CompanionComponentProps) => {
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);

  const [isSpeaking, setIspeaking] = useState(false);

  useEffect(() => {
    const onCallEnd = () => setCallStatus(CallStatus.FINISHED);

    const onCallStop = () => setCallStatus(CallStatus.ACTIVE);

    const onMessage = () => {};

    const onSpeechStart = () => setIspeaking(true);
    const onSpeechEnd = () => setIspeaking(false);

    const onError = (error: Error) => console.log("Error", error);

    vapi.on("call-start", onCallStop);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("error", onError);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);

    return () => {
      vapi.off("call-start", onCallStop);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("error", onError);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
    };
  }, []);

  return (
    <section className="flex flex-col h-[70vh]">
      <section className="flex gap-8 max-sm:flex-col">
        <div className="companion-section">
          <div
            className="companion-avatar"
            style={{ backgroundColor: getSubjectColor(subject) }}
          >
            <div
              className={cn("absolute transition-opacity duration-1000")}
            ></div>
          </div>
        </div>
      </section>
    </section>
  );
};

export default CompanionComponent;
