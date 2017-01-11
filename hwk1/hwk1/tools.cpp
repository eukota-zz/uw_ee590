#include <vector>
#include "tools.h"
#include "CL\cl.h"

/* Tools written by me (Darrell Ross) for use in my code
 */

namespace tools
{

	// Prints out a list of the functions stored in the funcs vector with their descriptions
	// This is used when printing a "menu" of items to choose to run
	void PrintFuncs(const std::vector<FuncPtr>& funcs)
	{
		int funcNum = 0;
		for (std::vector<FuncPtr>::const_iterator i = funcs.begin(), e = funcs.end(); i != e; ++i, funcNum++)
		{
			std::cout << funcNum << ": " << i->description.c_str() << std::endl;
		}
	}

	/*
	* Generate random value for input buffers
	*/
	void generateInputCL(cl_float* inputArray, cl_uint arrayWidth, cl_uint arrayHeight)
	{
		srand(12345);

		// random initialization of input
		size_t array_size = arrayWidth * arrayHeight;
		for (size_t i = 0; i < array_size; ++i)
		{
			inputArray[i] = (cl_float)(rand() % 1000); // mod to fix possible floating point comparison issues found during office hours with Logan
		}
	}

	void generateInputCMatrix(float arr[1024][1024])
	{
		srand(12345);
		for (size_t i = 0; i < 1024; i++)
		{
			for (size_t j = 0; j < 1024; j++)
			{
				arr[i][j] = (float)(rand() % 1000);
			}
		}

	}

	void generateInputC(float* inputArray, size_t arrayWidth, size_t arrayHeight)
	{
		srand(12345);

		// random initialization of input
		size_t array_size = arrayWidth * arrayHeight;
		for (size_t i = 0; i < array_size; ++i)
		{
			inputArray[i] = (float)(rand() % 1000); // mod to fix possible floating point comparison issues found during office hours with Logan
		}
	}

	// allocate space for a STL matrix
	void createEmptyMatrix(std::vector<std::vector<float> >* inputMatrix, size_t arrayWidth, size_t arrayHeight)
	{
		if (!inputMatrix)
			throw "invalid input";
		inputMatrix->clear();
		for (size_t i = 0; i < arrayHeight; i++)
		{
			std::vector<float> v(arrayWidth);
			inputMatrix->push_back(v);
		}
	}

	// fill STL matrix with random numbers
	void generateInputSTL(std::vector<std::vector<float> >* inputMatrix)
	{
		if (!inputMatrix || inputMatrix->empty() || inputMatrix->front().empty())
			throw "invalid input";

		// random number seed
		srand(12345);

		const size_t width = inputMatrix->front().size();
		const size_t height = inputMatrix->size();
		for (size_t row = 0; row < height; row++)
		{
			for (size_t col = 0; col < width; col++)
			{
				(*inputMatrix)[row][col] = (float)(rand() % 1000);
			}
		}
	}

	bool verifyEqual(const std::vector<std::vector<float> >& pA, const std::vector<std::vector<float> >& pB)
	{
		if (pA.size() != pB.size())
			return false;
		if (pA.empty() && pB.empty())
			return true;
		if (pA.front().size() != pB.front().size())
			return false;

		const size_t width = pA.front().size();
		const size_t height = pA.size();
		for (size_t row = 0; row < height; row++)
		{
			for (size_t col = 0; col < width; col++)
			{
				if (pA[row][col] != pB[row][col])
					return false;
			}
		}
		return true;
	}


} // end namespace tools