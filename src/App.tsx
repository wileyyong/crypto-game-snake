import React, { useEffect, useRef, useState } from 'react';
import { useWeb3React } from "@web3-react/core";
import { ethers } from 'ethers';
import Web3Modal from 'web3modal';
import axios from 'axios';
import './App.css';
import AppleLogo from './assets/applePixels.png';
import Monitor from './assets/oldMonitor.png';
import useInterval from './hooks/useInterval';
import Header from './header/index';

const canvasX = 1000;
const canvasY = 1000;
const initialSnake = [
  [4, 10],
  [4, 10],
];
const initialApple = [14, 10];
const scale = 50;
const timeDelay = 100;

const App = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { account } = useWeb3React();
  const [snake, setSnake] = useState(initialSnake);
  const [apple, setApple] = useState(initialApple);
  const [direction, setDirection] = useState([0, -1]);
  const [delay, setDelay] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);

  useInterval(() => runGame(), delay);

  useEffect(() => {
    let fruit = document.getElementById('fruit') as HTMLCanvasElement;
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        ctx.fillStyle = '#a3d001';
        snake.forEach(([x, y]) => ctx.fillRect(x, y, 1, 1));
        ctx.drawImage(fruit, apple[0], apple[1], 1, 1);
      }
    }
  }, [snake, apple, gameOver]);

  async function handleSetScore() {
    if (score > Number(localStorage.getItem('snakeScore'))) {
      localStorage.setItem('snakeScore', JSON.stringify(score));
    }
    if (score > 10) {
      await axios.post('https://snake-backend.vercel.app/payment/rewards', {address: account, rewards: (score/100).toFixed(2)})
      .then(res => {
        console.log(res);
        window.alert(`Congrats! You will receive ${(score/100).toFixed(2)} Matic rewards!`);
      })
    }
  }

  async function play() {
    const balance = window.localStorage.getItem('paid');
    if (!account) {
      window.alert('Connect metamask first!');
    } else if (balance && JSON.parse(`${balance}`) > 0.099999) {
      setSnake(initialSnake);
      setApple(initialApple);
      setDirection([1, 0]);
      setDelay(timeDelay);
      setScore(0);
      setGameOver(false);
    } else {
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(connection);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      const gasPrice = await provider.getGasPrice();
      const amount = 0.3;

      await signer
        .sendTransaction({
          from: address, // sender wallet address
          to: "0x98C4cB2832685d70391682e4880d3C4CE24043Dc",  // receiver address
          data: '0x',
          value: ethers.utils.parseEther(`${amount}`),
          gasLimit: ethers.utils.hexlify(100000),
          gasPrice: ethers.utils.hexlify(gasPrice),
        }).then((transaction: any) => {
          const balance = parseInt(transaction.value._hex, 16) / Math.pow(10, 18);
          window.localStorage.setItem('paid', balance.toFixed(2));
          if (window.confirm("Payment Succeed! Will you start game after 3 seconds?")) {
            setTimeout(() => {
              setSnake(initialSnake);
              setApple(initialApple);
              setDirection([1, 0]);
              setDelay(timeDelay);
              setScore(0);
              setGameOver(false);
            }, 3000);
          } else {
            // window.localStorage.setItem('paid', "OK");
          }
        })
        .catch((e) => {
          window.alert('Payment failed!');
          return;
        })
    }
  }
  function checkCollision(head: number[]) {
    for (let i = 0; i < snake.length; i++) {
      if (head[i] < 0 || head[i] * scale >= canvasX) return true;
    }
    for (const s of snake) {
      if (head[0] === s[0] && head[1] === s[1]) return true;
    }
    return false;
  }
  function appleAte(newSnake: number[][]) {
    let coord = apple.map(() => Math.floor((Math.random() * canvasX) / scale));
    if (newSnake[0][0] === apple[0] && newSnake[0][1] === apple[1]) {
      let newApple = coord;
      setScore(score + 1);
      setApple(newApple);
      return true;
    }
    return false;
  }

  function runGame() {
    const newSnake = [...snake];
    const newSnakeHead = [
      newSnake[0][0] + direction[0],
      newSnake[0][1] + direction[1],
    ];
    newSnake.unshift(newSnakeHead);
    if (checkCollision(newSnakeHead)) {
      setDelay(null);
      setGameOver(true);
      handleSetScore();
      const balance = window.localStorage.getItem('paid');
      const newBalance = parseFloat(`${balance}`) - 0.1;
      window.localStorage.setItem('paid', newBalance.toFixed(2));
    }
    if (!appleAte(newSnake)) {
      newSnake.pop();
    }
    setSnake(newSnake);
  }
  function changeDirection(e: React.KeyboardEvent<HTMLDivElement>) {
    switch (e.key) {
      case 'ArrowLeft':
        setDirection([-1, 0]);
        break;
      case 'ArrowUp':
        setDirection([0, -1]);
        break;
      case 'ArrowRight':
        setDirection([1, 0]);
        break;
      case 'ArrowDown':
        setDirection([0, 1]);
        break;
    }
  }

  return (
    <>
      <Header />
      <div onKeyDown={e => changeDirection(e)}>
        <img id="fruit" src={AppleLogo} alt="fruit" width="30" />
        <img src={Monitor} alt="fruit" width="4000" className="monitor" />
        <canvas
          className="playArea"
          ref={canvasRef}
          width={`${canvasX}px`}
          height={`${canvasY}px`}
        />
        {gameOver && <div className="gameOver">Game Over</div>}
        <button onClick={play} className="playButton">
          Play
        </button>
        <div className="scoreBox">
          <h2>Score: {score}</h2>
          <h2>High Score: {localStorage.getItem('snakeScore')}</h2>
        </div>
      </div>
    </>
  );
};

export default App;
