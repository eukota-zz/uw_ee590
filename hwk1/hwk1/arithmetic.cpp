#include <vector>
#include "arithmetic.h"

namespace dmath
{

	// Sequential Add with C++ STL
	/// @param[in] pA NxN matrix
	/// @param[in] pB NxN matrix
	/// @param[out] pC NxN matrix to populate with pA + pB
	void add(const std::vector<std::vector<float> >& pA, const std::vector< std::vector<float> >& pB, std::vector<std::vector<float> >* pC)
	{
		if (pA.empty() || pB.empty() || pA.size() != pB.size() || !pC)
			throw "invalid input";

		const size_t width = pA.front().size();
		const size_t height = pA.size();

		for (size_t x = 0; x < width; x++)
		{
			for (size_t y = 0; y < height; y++)
			{
				(*pC)[x][y] = pA[x][y] + pB[x][y];
			}
		}
	}

	// Sequential Add with C
	void add(float* matrixA, float* matrixB, float* matrixC, size_t width, size_t height)
	{
		const size_t s = width*height;
		for(size_t i=0; i<s; i++)
			matrixC[i] = matrixA[i] + matrixB[i];
	}

	// @param[in] pA scalar value
	// @param[in] pX N length vector
	// @param[in] pY N length vector
	// @param[out] pZ output results of pA*pX+pY
	void saxpy_1d(float pA, const std::vector<float>& pX, const std::vector<float>& pY, std::vector<float>* pZ)
	{
		if (pX.empty() || pY.empty() || !pZ   // general checks
			|| pX.size() != pY.size())		  // require pX and pY be Nx1
			throw "invalid input";

		const size_t N = pX.size();
		for (size_t i = 0; i < N; i++)
		{
			(*pZ)[i] = pA*pX[i] + pY[i];
		}
	}

	// @param[in] pA MxM matrix of values
	// @param[in] pX MxN matrix of values
	// @param[in] pY MxN matrix of values
	// @param[out] pZ output results of pA*pX+pY
	void saxpy_2d(const std::vector<std::vector<float> >& pA, const std::vector<std::vector<float> >& pX, const std::vector<std::vector<float> >& pY, std::vector<std::vector<float> >* pZ)
	{
		if (pA.empty() || pX.empty() || pY.empty() || !pZ // general checks
			|| pA.size() != pA.front().size()             // require pA MxM in size
			|| pA.size() != pX.size()				 	  // require pX be MxN
			|| pA.size() != pY.size())					  // require pY be MxN
			throw "invalid input";

		const size_t M = pA.size();
		const size_t N = pX.front().size();
		for (size_t row = 0; row < M; row++)
		{
			for (size_t col = 0; col < N; col++)
			{
				// Multiply the row of pA by the column of pX to get the row, column of product.  
				for (size_t inner = 0; inner < M; inner++)
				{
					(*pZ)[row][col] += pA[row][inner] * pX[inner][col];
				}
				// Add pY
				(*pZ)[row][col] += pY[row][col];
			}
		}
	}

	void saxpy_2d(float* pA, float* pX, float* pY, float* pZ, size_t width, size_t height)
	{
		for (size_t row = 0; row < height; row++)
		{
			for (size_t col = 0; col < width; col++)
			{
				// Multiply the row of pA by the column of pX to get the row, column of product.  
				const size_t id = row*width + col;
				for (size_t inner = 0; inner < width; inner++)
				{
					const size_t innerRowId = row*width + inner;
					const size_t innerColId = inner*width + col;
					pZ[id] += pA[innerRowId] * pX[innerColId];
				}
				// Add pY
				pZ[id] += pY[id];
			}
		}
	}
} // end namespace dmath