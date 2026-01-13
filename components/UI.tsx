import React, { useState } from 'react';
import { useGameStore } from '../store';
import { GamePhase } from '../types';

const PRESET_WORDS = ['甜粽子', '咸粽子', '蟑螂', '香菜', '五仁月饼', '红包'];

export const UI: React.FC = () => {
  const { phase, score, resetGame, setPhase, wordSettings, setWordSettings, collectedItems } = useGameStore();
  
  const [localSettings, setLocalSettings] = useState(wordSettings);

  const handleStartGame = () => {
      setWordSettings(localSettings);
      setPhase(GamePhase.GLASS);
  };

  const onDragStart = (e: React.DragEvent, word: string) => {
      e.dataTransfer.setData("text/plain", word);
      e.dataTransfer.effectAllowed = "copy";
  };

  const onDragOver = (e: React.DragEvent) => {
      e.preventDefault(); 
      e.dataTransfer.dropEffect = "copy";
  };

  const onDrop = (e: React.DragEvent, slot: 'bonus' | 'penalty' | 'taboo') => {
      e.preventDefault();
      const word = e.dataTransfer.getData("text/plain");
      if (word) {
          setLocalSettings(prev => ({ ...prev, [slot]: word }));
      }
  };

  // UI Scale 1.5x -> Text classes upgraded (e.g. text-sm -> text-lg, text-xl -> text-2xl/3xl)
  const DropSlot = ({ title, slotKey, colorClass, titleColor }: { title: string, slotKey: 'bonus' | 'penalty' | 'taboo', colorClass: string, titleColor: string }) => (
      <div 
        className={`flex items-center justify-between bg-white p-6 rounded-2xl shadow-md border-4 border-transparent transition-all ${localSettings[slotKey] ? 'border-pink-200' : 'border-dashed border-gray-300'}`}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, slotKey)}
      >
          <span className={`font-bold text-2xl ${titleColor} w-28`}>{title}</span>
          <div className={`flex-1 text-center font-bold text-3xl border-b-4 border-dashed ${localSettings[slotKey] ? 'border-gray-300 text-gray-800' : 'border-gray-200 text-gray-400'} pb-2`}>
              {localSettings[slotKey] || "拖拽"}
          </div>
      </div>
  );

  if (phase === GamePhase.GLASS) return null;

  return (
    <div className="absolute inset-0 z-50 pointer-events-none flex flex-col justify-between p-8">
      
      {/* HUD (Scaled 1.5x) */}
      {(phase === GamePhase.CONVEYOR || phase === GamePhase.GAMEOVER) && (
        <div className="w-full flex justify-between items-start">
          <div className="bg-white/90 backdrop-blur-md px-8 py-4 rounded-full border-4 border-pink-200 shadow-xl pointer-events-auto">
             <span className="text-xl font-bold text-gray-500 block mb-1">得分</span>
             <span className="text-5xl font-black text-pink-500 tracking-wider">{score}</span>
          </div>
          <div className="bg-blue-100/90 backdrop-blur-md px-6 py-4 rounded-full border-4 border-blue-200 shadow-xl">
             <span className="text-4xl">🏆 {collectedItems}</span>
          </div>
        </div>
      )}

      {/* Main Menu (Scaled 1.5x) */}
      {phase === GamePhase.MENU && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-pink-100/50 backdrop-blur-sm pointer-events-auto">
          <h1 className="text-8xl font-black text-white drop-shadow-lg mb-12 text-center" 
              style={{ textShadow: '4px 4px 0px #FF9FCE' }}>
            KNOCK<br/>KNOCK
          </h1>
          <button 
            onClick={() => setPhase(GamePhase.SETUP)}
            className="bg-white text-pink-500 text-4xl font-bold py-6 px-16 rounded-full shadow-[0_6px_0_rgb(236,72,153)] hover:translate-y-2 hover:shadow-none transition-all active:bg-gray-100"
          >
            开始游戏
          </button>
        </div>
      )}

      {/* Setup Screen (Scaled 1.5x) */}
      {phase === GamePhase.SETUP && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-pink-50 pointer-events-auto p-6 overflow-y-auto">
            <h2 className="text-5xl font-black text-pink-500 mb-8 mt-6">自定义玩法</h2>
            
            <p className="text-gray-500 mb-8 text-center text-lg">将下方的词块拖入对应的槽位中</p>

            <div className="w-full max-w-2xl space-y-6 mb-12">
                <DropSlot title="加分项" slotKey="bonus" colorClass="bg-yellow-50" titleColor="text-yellow-500" />
                <DropSlot title="扣分项" slotKey="penalty" colorClass="bg-pink-50" titleColor="text-pink-500" />
                <DropSlot title="禁忌项" slotKey="taboo" colorClass="bg-red-50" titleColor="text-red-600" />
            </div>

            <div className="bg-white/60 p-8 rounded-3xl mb-12 w-full max-w-2xl shadow-inner">
                <div className="flex flex-wrap gap-4 justify-center">
                    {PRESET_WORDS.map(word => (
                        <div 
                            key={word}
                            draggable
                            onDragStart={(e) => onDragStart(e, word)}
                            onClick={() => {
                                if (!localSettings.bonus || localSettings.bonus === '...') setLocalSettings({...localSettings, bonus: word});
                                else if (!localSettings.penalty || localSettings.penalty === '...') setLocalSettings({...localSettings, penalty: word});
                                else if (!localSettings.taboo || localSettings.taboo === '...') setLocalSettings({...localSettings, taboo: word});
                            }}
                            className="bg-white px-6 py-4 rounded-2xl shadow-lg border-b-4 border-pink-200 text-gray-600 text-2xl font-bold active:scale-95 transition-transform cursor-grab active:cursor-grabbing hover:bg-pink-50"
                        >
                            {word}
                        </div>
                    ))}
                </div>
                <p className="text-center text-gray-400 mt-6 text-sm">(手机端点击也可填入)</p>
            </div>

            <button 
                onClick={handleStartGame}
                disabled={!localSettings.bonus || !localSettings.penalty || !localSettings.taboo}
                className={`w-full max-w-md text-white text-3xl font-bold py-5 rounded-full shadow-[0_6px_0_rgba(0,0,0,0.2)] hover:translate-y-2 hover:shadow-none transition-all ${
                    (!localSettings.bonus || !localSettings.penalty || !localSettings.taboo) 
                    ? 'bg-gray-300 cursor-not-allowed' 
                    : 'bg-pink-500'
                }`}
            >
                确定设置
            </button>
        </div>
      )}

      {/* Game Over (Scaled 1.5x) */}
      {phase === GamePhase.GAMEOVER && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-auto">
          <div className="bg-white p-12 rounded-[2.5rem] shadow-2xl flex flex-col items-center max-w-md w-full animate-bounce-in">
            <h2 className="text-6xl font-black text-gray-800 mb-4">哎呀!</h2>
            <p className="text-gray-500 mb-10 text-center text-xl">碰到禁忌或漏掉太多盒子!</p>
            
            <div className="bg-pink-50 w-full rounded-2xl p-6 mb-10 text-center">
               <div className="text-lg text-gray-400 uppercase font-bold">最终得分</div>
               <div className="text-6xl font-black text-pink-500 my-2">{score}</div>
               <div className="text-xl text-blue-400 font-bold mt-2">获得藏品: {collectedItems}</div>
            </div>

            <button 
              onClick={resetGame}
              className="w-full bg-blue-400 text-white text-3xl font-bold py-6 rounded-2xl shadow-[0_6px_0_#60A5FA] hover:translate-y-2 hover:shadow-none transition-all"
            >
              再试一次
            </button>
          </div>
        </div>
      )}
    </div>
  );
};