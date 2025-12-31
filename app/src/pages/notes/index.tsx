import { observer } from 'mobx-react-lite';

const NotesPage = observer(() => {
  return (
    <div className="flex items-center justify-center h-full bg-gray-50">
      <div className="text-center">
        <i className="ri-tools-line text-6xl text-gray-300" />
        <p className="mt-4 text-xl text-gray-500">功能开发中</p>
      </div>
    </div>
  );
});

export default NotesPage;
