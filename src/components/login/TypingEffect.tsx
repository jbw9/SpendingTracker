import React, { useState, useEffect } from "react";

interface TypingEffectProps {
  text: string;
  typingSpeed?: number;
}

const TypingEffect: React.FC<TypingEffectProps> = ({
  text,
  typingSpeed = 0,
}) => {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        const char = text.charAt(index);
        if (char === "<") {
          const endTagIndex = text.indexOf(">", index) + 1;
          const tag = text.substring(index, endTagIndex);
          setDisplayedText((prev) => prev + tag);
          index = endTagIndex;
        } else {
          setDisplayedText((prev) => prev + char);
          index++;
        }
      } else {
        clearInterval(timer);
      }
    }, typingSpeed);

    return () => clearInterval(timer);
  }, [text, typingSpeed]);

  return <span dangerouslySetInnerHTML={{ __html: displayedText }} />;
};

export default TypingEffect;
