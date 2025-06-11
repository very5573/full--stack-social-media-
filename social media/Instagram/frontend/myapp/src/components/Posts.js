import React from 'react'
import Post from './Post'
import { useSelector } from 'react-redux'

const Posts = () => {
  const { posts } = useSelector(store => store.post);

  if (!posts || posts.length === 0) {
    return <div>No posts available</div>;
  }

  return (
    <div>
      {
        posts
          .filter(post => post && post._id) // ✅ null check + _id check
          .map((post) => <Post key={post._id} post={post} />)
      }
    </div>
  )
}

export default Posts
