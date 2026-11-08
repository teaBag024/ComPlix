import { useState } from 'react';
import { Button } from '../Common/Button';
export default function Preview() {
  const [count, setCount] = useState(0);
  return <Button onClick={() => setCount(count + 1)}>Clicked {count} times</Button>;
}
