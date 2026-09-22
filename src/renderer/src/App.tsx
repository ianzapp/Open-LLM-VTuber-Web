/* eslint-disable no-shadow */
// import { StrictMode } from 'react';
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { AiStateProvider } from "./context/ai-state-context";
import { Live2DConfigProvider } from "./context/live2d-config-context";
import { SubtitleProvider } from "./context/subtitle-context";
import { BgUrlProvider } from "./context/bgurl-context";
import WebSocketHandler from "./services/websocket-handler";
import { CameraProvider } from "./context/camera-context";
import { ChatHistoryProvider } from "./context/chat-history-context";
import { CharacterConfigProvider } from "./context/character-config-context";
import { VADProvider } from "./context/vad-context";
import { EngineEffects } from "./engine/engine-effects";
import { ProactiveSpeakProvider } from "./context/proactive-speak-context";
import { ScreenCaptureProvider } from "./context/screen-capture-context";
import { GroupProvider } from "./context/group-context";
import { BrowserProvider } from "./context/browser-context";
import { ModeProvider } from "./context/mode-context";
import { LookProvider } from "./context/look-context";
import { CompanionApp } from "./app/companion-app";

function App(): JSX.Element {
  return (
    <ChakraProvider value={defaultSystem}>
      {/* Provider shell only. The UI itself lives in ./app (CompanionApp). */}
      <ModeProvider>
        <AppWithGlobalStyles />
      </ModeProvider>
    </ChakraProvider>
  );
}

// New component to access mode for global styles
function AppWithGlobalStyles(): JSX.Element {
  return (
    <>
      <CameraProvider>
        <ScreenCaptureProvider>
          <CharacterConfigProvider>
            <ChatHistoryProvider>
              <AiStateProvider>
                <ProactiveSpeakProvider>
                  <Live2DConfigProvider>
                    <SubtitleProvider>
                      <VADProvider>
                        <BgUrlProvider>
                          <GroupProvider>
                            <BrowserProvider>
                              {/* LookProvider sits above WebSocketHandler: the audio task inside it uses useLook(). */}
                              <LookProvider>
                                <WebSocketHandler>
                                  <EngineEffects />
                                  <CompanionApp />
                                </WebSocketHandler>
                              </LookProvider>
                            </BrowserProvider>
                          </GroupProvider>
                        </BgUrlProvider>
                      </VADProvider>
                    </SubtitleProvider>
                  </Live2DConfigProvider>
                </ProactiveSpeakProvider>
              </AiStateProvider>
            </ChatHistoryProvider>
          </CharacterConfigProvider>
        </ScreenCaptureProvider>
      </CameraProvider>
    </>
  );
}

export default App;
